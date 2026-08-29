import { DataSource } from 'typeorm';
import { Category } from 'src/modules/shared/category/entities/category.entity';

const categories = [
  { name: 'Moda', slug: 'moda' },
  { name: 'Acessórios', slug: 'acessorios' },
  { name: 'Eletrónica', slug: 'eletronica' },
  { name: 'Alimentação', slug: 'alimentacao' },
  { name: 'Casa', slug: 'casa' },
  { name: 'Beleza', slug: 'beleza' },
  { name: 'Outros', slug: 'outros' },
];

export async function CategoriesSeed(dataSource: DataSource) {
  const repository = dataSource.getRepository(Category);

  for (const data of categories) {
    await repository.upsert(data, {
      conflictPaths: ['slug'],
      skipUpdateIfNoValuesChanged: true,
    });
  }
}
