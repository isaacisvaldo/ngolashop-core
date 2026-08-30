import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './entities/category.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoryService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
  ) {}

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  async findAll(page = 1, limit = 50) {
    const [data, total] = await this.categoryRepository.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      order: { name: 'ASC' },
    });
    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findAllActive() {
    return this.categoryRepository.find({
      where: { isActive: true },
      order: { name: 'ASC' },
    });
  }

  async findOne(id: number) {
    const category = await this.categoryRepository.findOne({ where: { id } });
    if (!category) {
      throw new NotFoundException(`Category #${id} not found`);
    }
    return category;
  }

  async create(dto: CreateCategoryDto) {
    const slug = dto.slug || this.slugify(dto.name);
    const existing = await this.categoryRepository.findOne({ where: { slug } });
    if (existing) {
      throw new ConflictException(`Já existe uma categoria com o slug "${slug}"`);
    }
    const category = this.categoryRepository.create({
      name: dto.name,
      slug,
      iconUrl: dto.iconUrl,
      isActive: dto.isActive ?? true,
    });
    return this.categoryRepository.save(category);
  }

  async update(id: number, dto: UpdateCategoryDto) {
    const category = await this.findOne(id);
    if (dto.name && !dto.slug) {
      dto.slug = this.slugify(dto.name);
    }
    if (dto.slug && dto.slug !== category.slug) {
      const existing = await this.categoryRepository.findOne({ where: { slug: dto.slug } });
      if (existing) {
        throw new ConflictException(`Já existe uma categoria com o slug "${dto.slug}"`);
      }
    }
    Object.assign(category, dto);
    return this.categoryRepository.save(category);
  }

  async remove(id: number) {
    const category = await this.findOne(id);
    await this.categoryRepository.remove(category);
    return { message: `Categoria #${id} removida com sucesso` };
  }
}
