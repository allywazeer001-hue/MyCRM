import { IsString, IsOptional, IsBoolean, IsArray, IsEnum } from 'class-validator';

export class CreatePublicationDto {
  @IsString() title: string;
  @IsOptional() @IsString() excerpt?: string;
  @IsOptional() @IsString() content?: string;
  @IsOptional() @IsString() coverImageUrl?: string;
  @IsOptional() @IsString() coverFileId?: string;
  @IsOptional() externalLinks?: any[];
  @IsOptional() categories?: any[];
  @IsOptional() tags?: any[];
  @IsOptional() @IsString() audienceType?: string;
  @IsOptional() audienceConfig?: any;
  @IsOptional() @IsBoolean() isEvent?: boolean;
  @IsOptional() eventDate?: string;
  @IsOptional() @IsString() eventCtaLabel?: string;
  @IsOptional() @IsString() eventCtaUrl?: string;
  @IsOptional() attachments?: any[];
}
