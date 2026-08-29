import { DataSource } from 'typeorm';
import { PaymentMethod } from 'src/modules/payment-method/entities/payment-method.entity';

const methods = [
  {
    name: 'Multicaixa Express',
    slug: 'multicaixa-express',
    position: 1,
    description: 'Pagamento via Multicaixa Express',
  },
  {
    name: 'Transferência Bancária',
    slug: 'transferencia-bancaria',
    position: 2,
    description: 'Transferência para conta bancária',
  },
  {
    name: 'Referência Multicaixa',
    slug: 'referencia-multicaixa',
    position: 3,
    description: 'Pagamento com referência Multicaixa',
  },
  {
    name: 'Dinheiro na Entrega',
    slug: 'dinheiro-na-entrega',
    position: 4,
    description: 'Pagamento em dinheiro ao receber',
  },
  {
    name: 'TAAG',
    slug: 'taag',
    position: 5,
    description: 'Pagamento via TAAG',
  },
];

export async function PaymentMethodSeed(dataSource: DataSource) {
  const repository = dataSource.getRepository(PaymentMethod);

  for (const data of methods) {
    await repository.upsert(data, {
      conflictPaths: ['slug'],
      skipUpdateIfNoValuesChanged: true,
    });
  }
}
