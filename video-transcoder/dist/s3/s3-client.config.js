"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_s3_1 = require("@aws-sdk/client-s3");
const s3Client = new client_s3_1.S3Client({
    endpoint: process.env.MINIO_ENDPOINT || 'http://nginx:9000',
    region: process.env.MINIO_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.MINIO_ACCESS_KEY || 'user',
        secretAccessKey: process.env.MINIO_SECRET_KEY || 'pwd',
    },
    forcePathStyle: true,
});
exports.default = s3Client;
//# sourceMappingURL=s3-client.config.js.map