import { IsString, IsNumber, IsBoolean, IsOptional, IsArray } from 'class-validator';

export class CreateRuleGroupDto {
  @IsString()
  @IsOptional()
  id?: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsNumber()
  @IsOptional()
  order?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsOptional()
  conditions?: any;

  @IsArray()
  @IsOptional()
  actions?: any[];
}
