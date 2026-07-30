import { IsOptional, IsString } from 'class-validator';

export class RejectRequestDto {
  @IsString()
  @IsOptional()
  reason?: string;
}
