import { Injectable, BadRequestException } from '@nestjs/common';
import { supabase } from '../common/supabase';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class UploadService {
  async uploadReceipt(
    userId: string,
    file: Express.Multer.File,
  ): Promise<string> {
    console.log(';print receipt');
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

    // Build path: userId/uuid.ext
    const ext = file.originalname.split('.').pop();
    const filename = `${userId}/${uuidv4()}.${ext}`;

    const { error } = await supabase.storage
      .from('receipts')
      .upload(filename, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (error) throw new BadRequestException('Upload failed: ' + error.message);

    // Return the path (we'll generate signed URLs when needed)
    return filename;
  }

  async getSignedUrl(path: string): Promise<string> {
    const { data, error } = await supabase.storage
      .from('receipts')
      .createSignedUrl(path, 60 * 60); // 1 hour expiry

    if (error) throw new BadRequestException('Could not generate URL');
    return data.signedUrl;
  }

  async deleteReceipt(path: string): Promise<void> {
    await supabase.storage.from('receipts').remove([path]);
  }
}
