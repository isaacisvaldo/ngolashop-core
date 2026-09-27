import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Report } from './entities/report.entity';
import { CreateReportDto } from './dto/report.dto';
import { Store } from '../store/entities/store.entity';
import { Product } from '../product/entities/product.entity';
import { Client } from '../client/entities/client.entity';
import { Review } from '../review/entities/review.entity';
import { paginate } from '../../common/require-user-type';

@Injectable()
export class ReportService {
  constructor(
    @InjectRepository(Report) private readonly reportRepository: Repository<Report>,
    @InjectRepository(Store) private readonly storeRepository: Repository<Store>,
    @InjectRepository(Product) private readonly productRepository: Repository<Product>,
    @InjectRepository(Client) private readonly clientRepository: Repository<Client>,
    @InjectRepository(Review) private readonly reviewRepository: Repository<Review>,
  ) {}

  async create(dto: CreateReportDto, clientId?: number) {
    const label = await this.resolveTarget(dto.targetType, dto.targetId);
    let reporterName = dto.reporterName?.trim() || null;
    let reporterEmail = dto.reporterEmail?.trim() || null;
    if (clientId) {
      const client = await this.clientRepository.findOne({ where: { id: clientId } });
      reporterName = client?.name ?? reporterName;
      reporterEmail = client?.email ?? reporterEmail;
    }
    const report = await this.reportRepository.save(
      this.reportRepository.create({
        targetType: dto.targetType,
        targetId: dto.targetId,
        targetLabel: label,
        reason: dto.reason.trim(),
        details: dto.details?.trim() || null,
        clientId: clientId ?? null,
        reporterName,
        reporterEmail,
      }),
    );
    return { id: report.id, message: 'Denúncia registada. Obrigado por nos ajudar.' };
  }

  async findAdmin(page = 1, limit = 20, status?: string, search?: string, targetType?: string) {
    const qb = this.reportRepository.createQueryBuilder('r').orderBy('r.createdAt', 'DESC');
    if (status) qb.andWhere('r.status = :status', { status });
    if (targetType) qb.andWhere('r.targetType = :targetType', { targetType });
    if (search) {
      qb.andWhere('(r.targetLabel ILIKE :s OR r.reason ILIKE :s OR r.reporterName ILIKE :s)', { s: `%${search}%` });
    }
    const [data, total] = await qb.skip((page - 1) * limit).take(limit).getManyAndCount();
    const counts = await this.reportRepository
      .createQueryBuilder('r')
      .select('r.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('r.status')
      .getRawMany<{ status: string; count: string }>();
    return {
      ...paginate(data, total, page, limit),
      counts: Object.fromEntries(counts.map((c) => [c.status, Number(c.count)])),
    };
  }

  async updateStatus(id: number, status: Report['status']) {
    const report = await this.reportRepository.findOne({ where: { id } });
    if (!report) throw new NotFoundException(`Denúncia #${id} não encontrada`);
    report.status = status;
    return this.reportRepository.save(report);
  }

  private async resolveTarget(type: Report['targetType'], id: number): Promise<string> {
    const notFound = () => new NotFoundException('O item denunciado não existe');
    switch (type) {
      case 'store': {
        const s = await this.storeRepository.findOne({ where: { id } });
        if (!s) throw notFound();
        return s.name;
      }
      case 'product': {
        const p = await this.productRepository.findOne({ where: { id } });
        if (!p) throw notFound();
        return p.name;
      }
      case 'client': {
        const c = await this.clientRepository.findOne({ where: { id } });
        if (!c) throw notFound();
        return c.name;
      }
      case 'review': {
        const r = await this.reviewRepository.findOne({ where: { id } });
        if (!r) throw notFound();
        return `Avaliação de ${r.authorName}: "${(r.comment ?? '').slice(0, 80)}"`;
      }
    }
  }
}
