import { IsIn } from 'class-validator';
import { KYC_DOCUMENT_KINDS } from '../uploads.constants';
import type { KycDocumentKind } from '../uploads.constants'

export class SignUploadDto {
  @IsIn([...KYC_DOCUMENT_KINDS]) kind!: KycDocumentKind;
}
