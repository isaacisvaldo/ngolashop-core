import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { HighlightService, type HighlightState } from './highlight.service';
import { BillingService } from './billing.service';
import {
  BookHighlightDto, GrantHighlightCreditDto, HighlightQuoteDto, PlacementsQueryDto, TopupDto, UpdateHighlightFormatDto, WalletPackageDto,
} from './dto/billing.dto';
import { requireUserType } from '../../common/require-user-type';
import { JwtAuthGuard } from '../shared/auth/guards/jwt-auth.guard';
import { AdminGuard } from '../shared/auth/guards/admin.guard';
import { CurrentUser } from '../shared/auth/decorators/current-user.decorator';
import type { JwtPayload } from '../shared/auth/decorators/current-user.decorator';
import { RequiredPermissions } from '../shared/auth/decorators/required-permissions.decorator';

@ApiTags('Destaques (público)')
@Controller('highlights')
export class HighlightPublicController {
  constructor(private readonly highlights: HighlightService) {}

  @Get('placements')
  @ApiOperation({ summary: 'Destaques ativos por posição (ordem rotativa)' })
  placements(@Query() q: PlacementsQueryDto) {
    return this.highlights.placements(q);
  }

  @Get('formats')
  @ApiOperation({ summary: 'Formatos, vagas e preços' })
  formats() {
    return this.highlights.formats();
  }
}

@ApiTags('Destaques (loja)')
@Controller('highlights/store')
@UseGuards(JwtAuthGuard)
export class HighlightStoreController {
  constructor(
    private readonly highlights: HighlightService,
    private readonly billing: BillingService,
  ) {}

  private storeId(user: JwtPayload) {
    return requireUserType(user, 'store').storeId!;
  }

  @Get('summary')
  @ApiOperation({ summary: 'Saldo, destaques incluídos, ofertas, formatos e pacotes' })
  summary(@CurrentUser() user: JwtPayload) {
    return this.highlights.storeSummary(this.storeId(user));
  }

  @Get()
  @ApiOperation({ summary: 'Destaques da loja com relatório' })
  list(@CurrentUser() user: JwtPayload) {
    return this.highlights.listForStore(this.storeId(user));
  }

  @Get('quote')
  @ApiOperation({ summary: 'Preço e próxima vaga disponível' })
  quote(@CurrentUser() user: JwtPayload, @Query() q: HighlightQuoteDto) {
    return this.highlights.quote(this.storeId(user), q);
  }

  @Post()
  @ApiOperation({ summary: 'Comprar / agendar destaque' })
  book(@CurrentUser() user: JwtPayload, @Body() dto: BookHighlightDto) {
    return this.highlights.book(this.storeId(user), user.sub, dto);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancelar destaque agendado (reembolso na carteira)' })
  cancel(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number) {
    return this.highlights.cancel(this.storeId(user), id);
  }

  @Post('wallet/topup')
  @ApiOperation({ summary: 'Carregar carteira (gera fatura para pagamento manual)' })
  topup(@CurrentUser() user: JwtPayload, @Body() dto: TopupDto) {
    return this.billing.createTopupInvoice(this.storeId(user), user.sub, dto.packageId, dto.paymentMethod);
  }
}

@ApiTags('Destaques (admin)')
@Controller('admin/highlights')
@UseGuards(JwtAuthGuard, AdminGuard)
export class HighlightAdminController {
  constructor(private readonly highlights: HighlightService) {}

  @Get()
  @RequiredPermissions('finance.read')
  @ApiOperation({ summary: 'Todos os destaques' })
  list(@Query('state') state?: HighlightState) {
    return this.highlights.adminList(state);
  }

  @Get('metrics')
  @RequiredPermissions('finance.read')
  @ApiOperation({ summary: 'Receita de destaques, ocupação e recompra' })
  async metrics() {
    return { ...(await this.highlights.metrics()), occupancy: await this.highlights.occupancy() };
  }

  @Get('formats')
  @RequiredPermissions('finance.read')
  formats() {
    return this.highlights.formats(true);
  }

  @Patch('formats/:key')
  @RequiredPermissions('finance.write')
  @ApiOperation({ summary: 'Editar preços, vagas e estado de um formato' })
  updateFormat(@Param('key') key: string, @Body() dto: UpdateHighlightFormatDto) {
    return this.highlights.updateFormat(key, dto);
  }

  @Get('packages')
  @RequiredPermissions('finance.read')
  packages() {
    return this.highlights.listPackages(true);
  }

  @Post('packages')
  @RequiredPermissions('finance.write')
  createPackage(@Body() dto: WalletPackageDto) {
    return this.highlights.savePackage(null, dto);
  }

  @Patch('packages/:id')
  @RequiredPermissions('finance.write')
  updatePackage(@Param('id', ParseIntPipe) id: number, @Body() dto: WalletPackageDto) {
    return this.highlights.savePackage(id, dto);
  }

  @Post(':id/cancel')
  @RequiredPermissions('finance.write')
  @ApiOperation({ summary: 'Cancelar destaque (reembolso proporcional)' })
  cancel(@Param('id', ParseIntPipe) id: number) {
    return this.highlights.adminCancel(id);
  }

  @Post('stores/:storeId/credit')
  @RequiredPermissions('finance.write')
  @ApiOperation({ summary: 'Oferecer um destaque grátis a uma loja' })
  grant(@Param('storeId', ParseIntPipe) storeId: number, @Body() dto: GrantHighlightCreditDto) {
    return this.highlights.grantCredit(storeId, dto.format, dto.days);
  }
}
