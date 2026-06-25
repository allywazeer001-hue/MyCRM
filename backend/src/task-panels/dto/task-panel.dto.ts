import { PartialType } from '@nestjs/mapped-types';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsArray,
  IsNotEmpty,
} from 'class-validator';

export class CreateTaskPanelDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsString()
  @IsNotEmpty()
  moduleId: string;

  @IsOptional()
  filterGroup?: any;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  assigneeRoles?: string[];

  @IsOptional()
  @IsString()
  sortField?: string;

  @IsOptional()
  @IsString()
  sortDir?: string;

  @IsOptional()
  @IsNumber()
  displayLimit?: number;

  @IsOptional()
  @IsBoolean()
  highlightNew?: boolean;

  @IsOptional()
  @IsNumber()
  newThresholdHours?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsNumber()
  order?: number;
}

export class UpdateTaskPanelDto extends PartialType(CreateTaskPanelDto) {}
