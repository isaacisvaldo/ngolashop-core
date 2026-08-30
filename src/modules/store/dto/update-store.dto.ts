import { IsString, IsOptional, IsArray, IsBoolean, IsObject, MaxLength } from 'class-validator';

export class UpdateStoreDto {
  @IsString()
  @IsOptional()
  @MaxLength(150)
  name?: string;

  @IsString()
  @IsOptional()
  slug?: string;

  @IsString()
  @IsOptional()
  logoUrl?: string;

  @IsString()
  @IsOptional()
  bannerUrl?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  whatsapp?: string;

  @IsString()
  @IsOptional()
  primaryColor?: string;

  @IsBoolean()
  @IsOptional()
  isPublished?: boolean;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  pickupLocation?: string;

  @IsArray()
  @IsOptional()
  socialLinks?: { id: string; nome: string; url: string }[];

  @IsArray()
  @IsOptional()
  deliveryZones?: { id: string; nome: string; custo: number; prazoDias: number }[];

  @IsObject()
  @IsOptional()
  payments?: {
    multicaixa: boolean;
    multicaixaRef: string;
    transferencia: boolean;
    transferenciaDados: string;
    entrega: boolean;
  };

  @IsObject()
  @IsOptional()
  chatbot?: {
    nome: string;
    boasVindas: string;
    horario: string;
    faq: { pergunta: string; resposta: string }[];
  };
}
