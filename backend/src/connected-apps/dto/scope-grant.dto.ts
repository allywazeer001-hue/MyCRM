import { IsEnum, IsString } from 'class-validator';
import { ScopeAccess } from '@prisma/client';

export class ScopeGrantDto {
  @IsString()
  scopeKey: string;

  @IsEnum(ScopeAccess)
  access: ScopeAccess;
}
