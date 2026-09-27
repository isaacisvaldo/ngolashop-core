import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'tb_settings' })
export class Setting {
  @PrimaryColumn({ name: 'key', type: 'varchar', length: 80 })
  key!: string;

  @Column({ name: 'value', type: 'text', nullable: false })
  value!: string;

  @Column({ name: 'type', type: 'varchar', length: 20, nullable: false, default: 'text' })
  type!: 'text' | 'number' | 'boolean';

  @Column({ name: 'label', type: 'varchar', length: 150, nullable: false })
  label!: string;

  @Column({ name: 'description', type: 'text', nullable: true })
  description!: string | null;

  @Column({ name: 'is_public', type: 'boolean', nullable: false, default: false })
  isPublic!: boolean;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp', nullable: false })
  updatedAt!: Date;
}
