import { Injectable } from '@nestjs/common';
import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

const OPTS = { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

function derive(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scrypt(password, salt, 64, OPTS, (err, key) => (err ? reject(err) : resolve(key))),
  );
}

@Injectable()
export class PasswordService {
  private dummy?: Promise<string>;

  async hash(password: string): Promise<string> {
    const salt = randomBytes(16);
    const key = await derive(password, salt);
    return `scrypt$${salt.toString('hex')}$${key.toString('hex')}`;
  }

  // Pass null when the account does not exist: it still burns the same CPU time.
  async verify(password: string, stored: string | null): Promise<boolean> {
    this.dummy ??= this.hash(randomBytes(8).toString('hex'));
    const [, saltHex, keyHex] = (stored ?? (await this.dummy)).split('$');
    const expected = Buffer.from(keyHex, 'hex');
    const actual = await derive(password, Buffer.from(saltHex, 'hex'));
    return stored !== null && timingSafeEqual(expected, actual);
  }
}
