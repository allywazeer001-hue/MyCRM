import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB — plenty for an email template image

@Injectable()
export class MediaService {
  private client: S3Client;
  private bucket: string;

  constructor(private config: ConfigService) {
    this.bucket = this.config.get('S3_BUCKET') ?? '';
    this.client = new S3Client({
      region: this.config.get('S3_REGION') ?? 'auto',
      endpoint: this.config.get('S3_ENDPOINT'),
      credentials: {
        accessKeyId: this.config.get('S3_ACCESS_KEY_ID') ?? '',
        secretAccessKey: this.config.get('S3_SECRET_ACCESS_KEY') ?? '',
      },
    });
  }

  get configured(): boolean {
    return !!this.bucket && !!this.config.get('S3_ACCESS_KEY_ID');
  }

  // The backend's own stable public URL — prefers Railway's auto-populated
  // production domain, falling back to a manually configured one so local
  // dev also produces URLs real email clients can actually reach.
  publicBaseUrl(): string {
    const railwayDomain = this.config.get('RAILWAY_PUBLIC_DOMAIN');
    if (railwayDomain) return `https://${railwayDomain}`;
    const manual = this.config.get('PUBLIC_BACKEND_URL');
    return manual ? String(manual).replace(/\/$/, '') : '';
  }

  async upload(file: { buffer: Buffer; originalname: string; mimetype: string; size: number }): Promise<{ url: string; key: string }> {
    if (!this.configured) throw new BadRequestException('Media storage is not configured on this server.');
    if (!file.mimetype.startsWith('image/')) throw new BadRequestException('Only image files are allowed.');
    if (file.size > MAX_SIZE) throw new BadRequestException('Image exceeds 10 MB limit.');

    const ext = (file.originalname.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
    const key = `${randomUUID()}.${ext}`;

    await this.client.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    }));

    const base = this.publicBaseUrl();
    return { key, url: `${base}/api/v1/public/media/${key}` };
  }

  // Streams an object back out — this is what makes a file "public" despite
  // Railway buckets themselves being private: the backend holds the only
  // credentials and re-serves the bytes through its own unauthenticated route.
  async get(key: string) {
    const res = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
    return res;
  }
}
