import { Body, Controller, Delete, ForbiddenException, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BillingService } from './billing.service';
import { CouponService } from './coupon.service';
import { EventService } from './event.service';
import {
  CouponDto, CreateInvoiceDto, GrantPlanDto, QuoteQueryDto, RejectInvoiceDto, SubmitProofDto, TrackEventDto, ValidateCouponDto,
} from './dto/billing.dto';
import { Plan } from '../shared/plan/entities/plan.entity';
import { AdminListQueryDto } from '../../common/dtos/admin-list-query.dto';
import { requireUserType } from '../../common/require-user-type';
import { JwtAuthGuard } from '../shared/auth/guards/jwt-auth.guard';
import { AdminGuard } from '../shared/auth/guards/admin.guard';
import { CurrentUser } from '../shared/auth/decorators/current-user.decorator';
import type { JwtPayload } from '../shared/auth/decorators/current-user.decorator';
import { RequiredPermissions } from '../shared/auth/decorators/required-permissions.decorator';
import { SettingService } from '../setting/setting.service';

/* ----------------------------- Público ----------------------------- */

@ApiTags('Billing (público)')
@Controller('billing')
export class BillingPublicController {
  constructor(
    private readonly billing: BillingService,
    private readonly settings: SettingService,
    @InjectRepository(Plan) private readonly planRepository: Repository<Plan>,
  ) {}

  @Get('plans')
  @ApiOperation({ summary: 'Planos ativos com preços, limites e funcionalidades' })
  async plans() {
    const plans = await this.planRepository.find({
      where: { isActive: true },
      relations: { features: true },
      order: { position: 'ASC', features: { position: 'ASC' } },
    });
    return {
      plans: plans.map((p) => ({
        ...this.billing.publicPlan(p),
        description: p.description,
        features: (p.features ?? []).map((f) => ({ text: f.text, included: f.isIncluded })),
      })),
      founder: await this.billing.founderInfo(),
      trialDays: await this.settings.getNumber('trial_days', 14),
      graceDays: await this.settings.getNumber('grace_days', 5),
    };
  }
}

@ApiTags('Eventos (público)')
@Controller('events')
export class EventController {
  constructor(private readonly events: EventService) {}

  @Post()
  @ApiOperation({ summary: 'Regista visita / clique (anónimo)' })
  track(@Body() dto: TrackEventDto) {
    return this.events.track(dto);
  }
}

/* ----------------------------- Vendedor ---------------------------- */

@ApiTags('Billing (loja)')
@Controller('billing/store')
@UseGuards(JwtAuthGuard)
export class BillingStoreController {
  constructor(
    private readonly billing: BillingService,
    private readonly events: EventService,
  ) {}

  private storeId(user: JwtPayload) {
    return requireUserType(user, 'store').storeId!;
  }

  @Get('overview')
  @ApiOperation({ summary: 'Plano atual, estado, uso e limites' })
  overview(@CurrentUser() user: JwtPayload) {
    return this.billing.overview(this.storeId(user));
  }

  @Get('traffic')
  @ApiOperation({ summary: 'Visitas, cliques e WhatsApp da loja' })
  traffic(@CurrentUser() user: JwtPayload) {
    return this.events.summary(this.storeId(user));
  }

  @Get('quote')
  @ApiOperation({ summary: 'Preço final (com desconto Fundador) para plano + ciclo' })
  quote(@CurrentUser() user: JwtPayload, @Query() q: QuoteQueryDto) {
    return this.billing.quote(this.storeId(user), q.planId, q.cycle);
  }

  @Get('payment-instructions')
  @ApiOperation({ summary: 'Dados para pagamento (Multicaixa Express, referência, IBAN)' })
  instructions(@CurrentUser() user: JwtPayload) {
    this.storeId(user);
    return this.billing.paymentInstructions();
  }

  @Get('invoices')
  @ApiOperation({ summary: 'Faturas da loja' })
  invoices(@CurrentUser() user: JwtPayload) {
    return this.billing.listInvoices(this.storeId(user));
  }

  @Post('invoices')
  @ApiOperation({ summary: 'Gerar fatura para mudar/renovar plano' })
  createInvoice(@CurrentUser() user: JwtPayload, @Body() dto: CreateInvoiceDto) {
    requireUserType(user, 'store');
    if (!user.rootAdmin) {
      // Só o proprietário gere o plano
      throw new ForbiddenException('Apenas o proprietário da loja pode gerir o plano');
    }
    return this.billing.createInvoice(user.storeId!, user.sub, dto.planId, dto.cycle, dto.paymentMethod);
  }

  @Post('invoices/:id/proof')
  @ApiOperation({ summary: 'Enviar comprovativo de pagamento' })
  submitProof(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: SubmitProofDto) {
    return this.billing.submitProof(id, this.storeId(user), dto);
  }

  @Post('invoices/:id/cancel')
  @ApiOperation({ summary: 'Cancelar fatura pendente' })
  cancel(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number) {
    return this.billing.cancelInvoice(id, this.storeId(user));
  }
}

@ApiTags('Cupões')
@Controller('coupons')
export class CouponController {
  constructor(private readonly coupons: CouponService) {}

  @Post('validate')
  @ApiOperation({ summary: 'Validar cupão no checkout (público)' })
  async validate(@Body() dto: ValidateCouponDto) {
    const { coupon, discount } = await this.coupons.evaluate(dto.storeId, dto.code, dto.subtotal);
    return { code: coupon.code, type: coupon.type, value: Number(coupon.value), discount };
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Cupões da loja' })
  list(@CurrentUser() user: JwtPayload) {
    return this.coupons.list(requireUserType(user, 'store').storeId!);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Criar cupão (Crescer ou superior)' })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CouponDto) {
    return this.coupons.create(requireUserType(user, 'store').storeId!, dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Editar cupão' })
  update(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: CouponDto) {
    return this.coupons.update(requireUserType(user, 'store').storeId!, id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Remover cupão' })
  remove(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number) {
    return this.coupons.remove(requireUserType(user, 'store').storeId!, id);
  }
}

/* ------------------------------ Admin ------------------------------ */

@ApiTags('Billing (admin)')
@Controller('admin/billing')
@UseGuards(JwtAuthGuard, AdminGuard)
export class BillingAdminController {
  constructor(private readonly billing: BillingService) {}

  @Get('metrics')
  @RequiredPermissions('finance.read')
  @ApiOperation({ summary: 'Receita, MRR, estado das lojas e KPIs' })
  metrics() {
    return this.billing.metrics();
  }

  @Get('invoices')
  @RequiredPermissions('withdrawal.read')
  @ApiOperation({ summary: 'Faturas / pagamentos a validar' })
  invoices(@Query() q: AdminListQueryDto) {
    return this.billing.adminInvoices(q.page, q.limit, q.status, q.search);
  }

  @Post('invoices/:id/approve')
  @RequiredPermissions('withdrawal.write')
  @ApiOperation({ summary: 'Confirmar pagamento e ativar plano' })
  approve(@Param('id', ParseIntPipe) id: number, @CurrentUser('sub') adminId: number) {
    return this.billing.approveInvoice(id, adminId);
  }

  @Post('invoices/:id/reject')
  @RequiredPermissions('withdrawal.write')
  @ApiOperation({ summary: 'Rejeitar comprovativo' })
  reject(@Param('id', ParseIntPipe) id: number, @CurrentUser('sub') adminId: number, @Body() dto: RejectInvoiceDto) {
    return this.billing.rejectInvoice(id, adminId, dto.reason);
  }

  @Get('subscriptions')
  @RequiredPermissions('commission.read')
  @ApiOperation({ summary: 'Estado da subscrição de cada loja' })
  subscriptions() {
    return this.billing.adminSubscriptions();
  }

  @Get('stores/:storeId')
  @RequiredPermissions('commission.read')
  @ApiOperation({ summary: 'Plano, uso e faturas de uma loja' })
  async store(@Param('storeId', ParseIntPipe) storeId: number) {
    return { overview: await this.billing.overview(storeId), invoices: await this.billing.listInvoices(storeId) };
  }

  @Post('stores/:storeId/grant')
  @RequiredPermissions('commission.write')
  @ApiOperation({ summary: 'Atribuir plano manualmente (oferta/compensação)' })
  grant(@Param('storeId', ParseIntPipe) storeId: number, @Body() dto: GrantPlanDto) {
    return this.billing.grantPlan(storeId, dto.planId, dto.days, dto.notes);
  }

  @Post('sync')
  @RequiredPermissions('commission.write')
  @ApiOperation({ summary: 'Reprocessar estados (downgrades, produtos ocultos)' })
  async sync() {
    await this.billing.runLifecycle();
    return { message: 'Estados de subscrição atualizados' };
  }
}
