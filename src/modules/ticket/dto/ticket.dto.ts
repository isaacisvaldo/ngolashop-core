import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateTicketDto {
  @ApiProperty({ example: 'Não consigo alterar o meu pedido' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  subject!: string;

  @ApiProperty({ example: 'Descreva o problema...' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  message!: string;

  @ApiPropertyOptional({ enum: ['low', 'medium', 'high'] })
  @IsOptional()
  @IsIn(['low', 'medium', 'high'])
  priority?: 'low' | 'medium' | 'high';
}

export class TicketMessageDto {
  @ApiProperty({ example: 'Obrigado, já está resolvido.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  message!: string;
}

export class UpdateTicketDto {
  @ApiPropertyOptional({ enum: ['open', 'in_progress', 'closed'] })
  @IsOptional()
  @IsIn(['open', 'in_progress', 'closed'])
  status?: 'open' | 'in_progress' | 'closed';

  @ApiPropertyOptional({ enum: ['low', 'medium', 'high'] })
  @IsOptional()
  @IsIn(['low', 'medium', 'high'])
  priority?: 'low' | 'medium' | 'high';

  @ApiPropertyOptional({ example: 1, nullable: true })
  @IsOptional()
  @IsInt()
  assignedAdminId?: number | null;
}
