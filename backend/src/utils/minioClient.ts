import * as Minio from 'minio';
import dotenv from 'dotenv';
dotenv.config();

export const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT || 'localhost',
  port: parseInt(process.env.MINIO_PORT || '9000'),
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY || 'admin',
  secretKey: process.env.MINIO_SECRET_KEY || 'password',
});

export const MINIO_BUCKET = process.env.MINIO_BUCKET || 'paper-pilot-docs';

export async function initMinio() {
  try {
    const exists = await minioClient.bucketExists(MINIO_BUCKET);
    if (!exists) {
      await minioClient.makeBucket(MINIO_BUCKET, 'us-east-1');
      console.log(`[MinIO] Bucket '${MINIO_BUCKET}' created successfully.`);
    } else {
      console.log(`[MinIO] Bucket '${MINIO_BUCKET}' already exists.`);
    }
  } catch (err) {
    console.error('[MinIO] Error initializing bucket:', err);
  }
}
