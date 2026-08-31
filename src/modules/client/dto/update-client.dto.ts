import { PartialType } from '@nestjs/swagger';
import { RegisterClientDto } from './register-client.dto';

export class UpdateClientDto extends PartialType(RegisterClientDto) {}
