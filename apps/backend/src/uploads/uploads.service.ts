import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import { randomUUID } from 'node:crypto';
import type { Env } from '../config/env';
import {
  DOWNLOAD_URL_TTL_SECONDS,
  KYC_ALLOWED_FORMATS,
  KYC_MAX_BYTES,
  KycDocumentKind,
  REQUIRED_KYC_KINDS,
} from './uploads.constants';

export type OwnerKind = 'provider' | 'distributor';

export type UploadTicket = {
  uploadUrl: string;
  fields: Record<string, string | number>;
  expiresAt: string;
};

export type VerifiedDocument = { kind: KycDocumentKind; publicId: string; format: string; bytes: number };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const httpCode = (e: unknown): number | undefined => {
  const o = e as { http_code?: number; error?: { http_code?: number } } | undefined;
  return o?.http_code ?? o?.error?.http_code;
};

@Injectable()
export class UploadsService {
  private readonly cloudName: string;
  private readonly apiKey: string;
  private readonly apiSecret: string;

  constructor(private readonly config: ConfigService<Env, true>) {
    this.cloudName = this.config.get('CLOUDINARY_CLOUD_NAME', { infer: true });
    this.apiKey = this.config.get('CLOUDINARY_API_KEY', { infer: true });
    this.apiSecret = this.config.get('CLOUDINARY_API_SECRET', { infer: true });

    cloudinary.config({
      cloud_name: this.cloudName,
      api_key: this.apiKey,
      api_secret: this.apiSecret,
      secure: true,
    });
  }

  private prefix(owner: OwnerKind, orgId: string): string {
    return `kyc/${owner}/${orgId}/`;
  }

  signKycUpload(owner: OwnerKind, orgId: string, kind: KycDocumentKind): UploadTicket {
    const timestamp = Math.floor(Date.now() / 1000);
    const params = {
      allowed_formats: KYC_ALLOWED_FORMATS.join(','),
      public_id: `${this.prefix(owner, orgId)}${kind.toLowerCase()}-${randomUUID()}`,
      timestamp,
      type: 'authenticated',
    };
    const signature = cloudinary.utils.api_sign_request(params, this.apiSecret);
    return {
      uploadUrl: `https://api.cloudinary.com/v1_1/${this.cloudName}/image/upload`,
      fields: { ...params, api_key: this.apiKey, signature },
      expiresAt: new Date((timestamp + 3600) * 1000).toISOString(),
    };
  }

  async verifyKycDocuments(
    owner: OwnerKind,
    orgId: string,
    docs: { kind: KycDocumentKind; publicId: string }[],
  ): Promise<VerifiedDocument[]> {
    for (const kind of REQUIRED_KYC_KINDS) {
      if (!docs.some((d) => d.kind === kind)) throw new BadRequestException(`${kind} is required`);
    }
    if (new Set(docs.map((d) => d.publicId)).size !== docs.length) {
      throw new BadRequestException('Each document must be a separate upload');
    }
    const prefix = this.prefix(owner, orgId);
    return Promise.all(docs.map((d) => this.verifyOne(prefix, d)));
  }

  private async verifyOne(
    prefix: string,
    d: { kind: KycDocumentKind; publicId: string },
  ): Promise<VerifiedDocument> {
    const expected = `${prefix}${d.kind.toLowerCase()}-`;
    if (!d.publicId.startsWith(expected) || !UUID.test(d.publicId.slice(expected.length))) {
      throw new BadRequestException(`Document ${d.kind} was not uploaded through your signed upload`);
    }
    let res: { bytes: number; format: string };
    try {
      res = await cloudinary.api.resource(d.publicId, { type: 'authenticated', resource_type: 'image' });
    } catch (e) {
      if (httpCode(e) === 404) throw new BadRequestException(`Document ${d.kind} has not been uploaded yet`);
      throw new ServiceUnavailableException('Document storage is unavailable, try again shortly');
    }
    const format = res.format?.toLowerCase();
    if (!(KYC_ALLOWED_FORMATS as readonly string[]).includes(format) || res.bytes > KYC_MAX_BYTES) {
      await cloudinary.uploader
        .destroy(d.publicId, { type: 'authenticated', resource_type: 'image', invalidate: true })
        .catch(() => undefined);
      throw new BadRequestException(`Document ${d.kind} must be a JPG, PNG or PDF under 5 MB`);
    }
    return { kind: d.kind, publicId: d.publicId, format, bytes: res.bytes };
  }

  signedDownloadUrl(publicId: string, format: string): { url: string; expiresAt: string } {
    const expires = Math.floor(Date.now() / 1000) + DOWNLOAD_URL_TTL_SECONDS;
    const url = cloudinary.utils.private_download_url(publicId, format, {
      type: 'authenticated',
      resource_type: 'image',
      expires_at: expires,
    });
    return { url, expiresAt: new Date(expires * 1000).toISOString() };
  }
}
