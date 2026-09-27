import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export type StoreEventType = 'store_view' | 'product_view' | 'whatsapp_click' | 'product_click';

/** Visitas e interações públicas — alimentam as estatísticas da loja e os relatórios de destaques. */
@Entity({ name: 'tb_store_events' })
export class StoreEvent {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column({ name: 'store_id', type: 'integer' })
  storeId!: number;

  @Column({ name: 'product_id', type: 'integer', nullable: true })
  productId!: number | null;

  @Column({ name: 'type', type: 'varchar', length: 30 })
  type!: StoreEventType;

  @Column({ name: 'source', type: 'varchar', length: 30, default: 'organic' })
  source!: string;

  @Column({ name: 'highlight_id', type: 'integer', nullable: true })
  highlightId!: number | null;

  @Column({ name: 'visitor_id', type: 'varchar', length: 64, nullable: true })
  visitorId!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;
}
