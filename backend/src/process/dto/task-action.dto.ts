import { IsString, IsIn, IsOptional } from 'class-validator';

export class TaskActionDto {
  @IsString()
  @IsIn(['approve', 'reject', 'request_info'])
  action: string;

  @IsString()
  @IsOptional()
  comment?: string;
}
