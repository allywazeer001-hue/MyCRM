import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsArray,
  IsIn,
  ValidateNested,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PartialType } from '@nestjs/mapped-types';

export class CreateStageDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNumber()
  @IsNotEmpty()
  order: number;

  @IsString()
  @IsIn(['role', 'user', 'field', 'manager'])
  assigneeType: string;

  @IsString()
  @IsOptional()
  assigneeRole?: string;

  @IsString()
  @IsOptional()
  assigneeUserId?: string;

  @IsString()
  @IsOptional()
  assigneeField?: string;

  @IsArray()
  @IsString({ each: true })
  actions: string[];

  @IsNumber()
  @IsOptional()
  dueDays?: number;

  @IsOptional()
  conditions?: any;

  @IsString()
  @IsOptional()
  onApprove?: string;

  @IsString()
  @IsOptional()
  onReject?: string;

  @IsString()
  @IsOptional()
  onRequestInfo?: string;

  @IsBoolean()
  @IsOptional()
  notifySubmitter?: boolean;

  @IsBoolean()
  @IsOptional()
  notifyAssignee?: boolean;
}

export class CreateBlueprintDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  moduleId?: string;

  @IsString()
  @IsOptional()
  triggerField?: string;

  @IsString()
  @IsOptional()
  triggerValue?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateStageDto)
  stages: CreateStageDto[];
}

export class UpdateBlueprintDto extends PartialType(CreateBlueprintDto) {}
