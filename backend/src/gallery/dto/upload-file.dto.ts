import { IsOptional, IsString } from 'class-validator';

export class UploadFileDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsString() tags?: string; // JSON string array
}
