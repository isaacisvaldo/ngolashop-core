import { DataSource } from 'typeorm';
import { Country } from 'src/modules/shared/country/entities/country.entity';
import { Province } from 'src/modules/shared/province/entities/province.entity';

const angolaProvinces = [
  'Bengo',
  'Benguela',
  'Bié',
  'Cabinda',
  'Cuando-Cubango',
  'Cuanza Norte',
  'Cuanza Sul',
  'Cunene',
  'Huambo',
  'Huíla',
  'Icolongo',
  'Luanda',
  'Lunda Norte',
  'Lunda Sul',
  'Malanje',
  'Moxico',
  'Namibe',
  'Uíge',
  'Zaire',
];

export async function CountrySeed(dataSource: DataSource) {
  const countryRepo = dataSource.getRepository(Country);
  const provinceRepo = dataSource.getRepository(Province);

  // Upsert Angola
  await countryRepo.upsert(
    { name: 'Angola', code: 'AO' },
    { conflictPaths: ['code'], skipUpdateIfNoValuesChanged: true },
  );
  const angola = await countryRepo.findOneOrFail({ where: { code: 'AO' } });

  // Upsert provinces
  for (let i = 0; i < angolaProvinces.length; i++) {
    await provinceRepo.upsert(
      { name: angolaProvinces[i], country: { id: angola.id } },
      { conflictPaths: ['name', 'country'], skipUpdateIfNoValuesChanged: true },
    );
  }
}
