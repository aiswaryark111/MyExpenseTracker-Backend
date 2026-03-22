import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CategoriesService } from './categories.service';

@UseGuards(AuthGuard('jwt'))
@Controller('categories')
export class CategoriesController {
  constructor(private categoriesService: CategoriesService) {}

  @Get()
  findAll(@Request() req) {
    return this.categoriesService.findAll(req.user.id);
  }

  @Post()
  create(@Request() req, @Body() body: { name: string; icon: string }) {
    return this.categoriesService.create(req.user.id, body);
  }
}
