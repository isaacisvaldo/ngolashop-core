import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { WalletTransaction } from './entities/highlight.entity';

/** Carteira de saldo para destaques — um livro-razão por loja; o saldo é o do último movimento. */
@Injectable()
export class WalletService {
  constructor(
    @InjectRepository(WalletTransaction) private readonly txRepository: Repository<WalletTransaction>,
  ) {}

  async balance(storeId: number, manager?: EntityManager): Promise<number> {
    const repo = manager ? manager.getRepository(WalletTransaction) : this.txRepository;
    const last = await repo.findOne({ where: { storeId }, order: { id: 'DESC' } });
    return last ? Number(last.balanceAfter) : 0;
  }

  history(storeId: number) {
    return this.txRepository.find({ where: { storeId }, order: { id: 'DESC' }, take: 50 });
  }

  /**
   * Movimenta o saldo dentro de uma transação, bloqueando a loja para evitar
   * que dois pedidos simultâneos gastem o mesmo saldo.
   */
  async move(
    manager: EntityManager,
    storeId: number,
    amount: number,
    type: WalletTransaction['type'],
    refs: { invoiceId?: number; highlightId?: number; notes?: string } = {},
  ) {
    await manager.query(`SELECT id FROM tb_stores WHERE id = $1 FOR UPDATE`, [storeId]);
    const current = await this.balance(storeId, manager);
    const next = Math.round((current + amount) * 100) / 100;
    if (next < 0) {
      throw new BadRequestException(`Saldo insuficiente: tem ${current.toLocaleString('pt-PT')} Kz na carteira.`);
    }
    return manager.getRepository(WalletTransaction).save(
      manager.getRepository(WalletTransaction).create({
        storeId,
        type,
        amount,
        balanceAfter: next,
        invoiceId: refs.invoiceId ?? null,
        highlightId: refs.highlightId ?? null,
        notes: refs.notes ?? null,
      }),
    );
  }

  /** Movimento isolado (abre a sua própria transação). */
  moveNow(storeId: number, amount: number, type: WalletTransaction['type'], refs: { invoiceId?: number; highlightId?: number; notes?: string } = {}) {
    return this.txRepository.manager.transaction((m) => this.move(m, storeId, amount, type, refs));
  }
}
