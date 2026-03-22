import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './category.entity';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private categoriesRepository: Repository<Category>,
  ) {}

  // Returns default categories + user's custom ones
  async findAll(userId: string): Promise<Category[]> {
    return this.categoriesRepository.find({
      where: [{ userId }, { isDefault: true }],
      order: { isDefault: 'DESC', name: 'ASC' },
    });
  }

  async create(userId: string, data: { name: string; icon: string }) {
    const category = this.categoriesRepository.create({
      ...data,
      userId,
      isDefault: false,
    });
    return this.categoriesRepository.save(category);
  }
}
