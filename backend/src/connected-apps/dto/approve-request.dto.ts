import { Type } from 'class-transformer';
import { IsArray, ValidateNested } from 'class-validator';
import { ScopeGrantDto } from './scope-grant.dto';

export class ApproveRequestDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScopeGrantDto)
  scopes: ScopeGrantDto[];
}
