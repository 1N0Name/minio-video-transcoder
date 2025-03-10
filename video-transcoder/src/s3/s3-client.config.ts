import { S3Client } from '@aws-sdk/client-s3';

const s3Client = new S3Client({
    endpoint: process.env.MINIO_ENDPOINT || 'http://nginx:9000',
    region: process.env.MINIO_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.MINIO_ACCESS_KEY || 'user',
        secretAccessKey: process.env.MINIO_SECRET_KEY || 'pwd',
    },
    forcePathStyle: true,
});

export default s3Client;
