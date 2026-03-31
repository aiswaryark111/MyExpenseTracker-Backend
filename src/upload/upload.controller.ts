import {
  Controller,
  Post,
  Get,
  Delete,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth } from '@nestjs/swagger';
import { UploadService } from './upload.service';
import { memoryStorage } from 'multer';

@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('upload')
export class UploadController {
  constructor(private uploadService: UploadService) {}

  @Post('receipt')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(), // keep in memory, we send to Supabase
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    }),
  )
  async uploadReceipt(
    @Request() req,
    @UploadedFile() file: Express.Multer.File,
  ) {
    console.log('=== UPLOAD HIT ===');
    console.log('User:', req.user?.id, 'isPremium:', req.user);
    console.log('File:', file?.originalname, file?.mimetype, file?.size);
    if (!file) throw new BadRequestException('No file uploaded');

    // Check premium status
    if (!req.user.isPremium) {
      throw new BadRequestException(
        'Receipt uploads are a Premium feature. Please upgrade.',
      );
    }

    const path = await this.uploadService.uploadReceipt(req.user.id, file);
    return { path };
  }

  @Get('receipt-url')
  async getReceiptUrl(@Query('path') path: string) {
    if (!path) throw new BadRequestException('Path is required');
    const url = await this.uploadService.getSignedUrl(path);
    return { url };
  }

  @Delete('receipt')
  async deleteReceipt(@Query('path') path: string) {
    if (!path) throw new BadRequestException('Path is required');
    await this.uploadService.deleteReceipt(path);
    return { success: true };
  }
}
