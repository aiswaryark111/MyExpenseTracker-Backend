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
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async uploadReceipt(
    @Request() req,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('No file uploaded');

    if (!req.user.isPremium) {
      throw new BadRequestException(
        'Receipt uploads are a Premium feature. Please upgrade.',
      );
    }

    const key = await this.uploadService.uploadReceipt(req.user.id, file);
    return { path: key };
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
