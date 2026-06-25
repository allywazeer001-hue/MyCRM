import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class UpdatePublicationDto {
  @IsOptional() @IsString() title?: string;
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
