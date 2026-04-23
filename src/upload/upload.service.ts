import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class UploadService {
  private s3: S3Client;
  private bucket: string;

  constructor(private configService: ConfigService) {
    this.s3 = new S3Client({
      region: process.env.AWS_REGION ?? 'eu-west-1', // Lambda sets this automatically
    });
    this.bucket = process.env.AWS_RECEIPTS_BUCKET ?? 'expenseiq-receipts';
  }

  async uploadReceipt(
    userId: string,
    file: Express.Multer.File,
  ): Promise<string> {
    if (!file) throw new BadRequestException('No file provided');

    // Only allow images and PDFs
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/pdf',
    ];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException('Only images and PDFs are allowed');
    }

    // Max 5MB
    if (file.size > 5 * 1024 * 1024) {
      throw new BadRequestException('File size must be under 5MB');
    }

    // Build key: userId/uuid.ext
    const ext = file.originalname.split('.').pop();
    const key = `${userId}/${uuidv4()}.${ext}`;

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    });

    await this.s3.send(command);

    return key;
  }

  async getSignedUrl(key: string): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    // URL expires in 1 hour
    return getSignedUrl(this.s3, command, { expiresIn: 3600 });
  }

  async deleteReceipt(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    await this.s3.send(command);
  }
}
