import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as Minio from 'minio';

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private client: Minio.Client | null = null;
  private bucket: string;
  private ready = false;

  constructor() {
    this.bucket = process.env.MINIO_BUCKET ?? 'thesis-documents';
  }

  async onModuleInit() {
    try {
      this.client = new Minio.Client({
        endPoint: process.env.MINIO_ENDPOINT ?? 'localhost',
        port: Number(process.env.MINIO_PORT ?? 9000),
        useSSL: process.env.MINIO_USE_SSL === 'true',
        accessKey: process.env.MINIO_ACCESS_KEY ?? 'minioadmin',
        secretKey: process.env.MINIO_SECRET_KEY ?? 'minioadmin123',
        region: process.env.MINIO_REGION ?? 'us-east-1',
      });
      const exists = await this.client.bucketExists(this.bucket);
      if (!exists) {
        await this.client.makeBucket(this.bucket, process.env.MINIO_REGION ?? 'us-east-1');
      }
      this.ready = true;
      this.logger.log(`MinIO bucket "${this.bucket}" ready`);
    } catch (err) {
      this.logger.warn(
        `MinIO unavailable — file storage disabled until docker compose is up: ${(err as Error).message}`,
      );
    }
  }

  private ensureClient(): Minio.Client {
    if (!this.client || !this.ready) {
      throw new Error('Storage service is not available. Start MinIO with docker compose.');
    }
    return this.client;
  }

  async upload(key: string, buffer: Buffer, contentType: string): Promise<void> {
    const client = this.ensureClient();
    await client.putObject(this.bucket, key, buffer, buffer.length, {
      'Content-Type': contentType,
    });
  }

  async download(key: string): Promise<Buffer> {
    const client = this.ensureClient();
    const stream = await client.getObject(this.bucket, key);
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      stream.on('data', (chunk) => chunks.push(chunk as Buffer));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
    });
  }

  async getPresignedUrl(key: string, expirySeconds = 3600): Promise<string> {
    const client = this.ensureClient();
    let url = await client.presignedGetObject(this.bucket, key, expirySeconds);
    
    const publicEndpoint = process.env.MINIO_PUBLIC_ENDPOINT;
    if (publicEndpoint) {
      const internalEndpoint = process.env.MINIO_ENDPOINT ?? 'localhost';
      url = url.replace(`http://${internalEndpoint}:`, `http://${publicEndpoint}:`);
    }
    
    return url;
  }
}
