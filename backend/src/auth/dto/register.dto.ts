import { IsEmail, IsString, MinLength, IsOptional, IsArray } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsString()
  @IsOptional()
  organizationName?: string;

  @IsString()
  @IsOptional()
  organizationSlug?: string;

  @IsString()
  @IsOptional()
  organizationCode?: string;

  @IsString()
  @IsOptional()
  organizationDescription?: string;

  @IsString()
  @IsOptional()
  organizationAddress?: string;

  @IsString()
  @IsOptional()
  organizationEmail?: string;

  @IsString()
  @IsOptional()
  organizationWebsite?: string;

  @IsString()
  @IsOptional()
  organizationIndustry?: string;

  @IsString()
  @IsOptional()
  organizationLogo?: string;

  @IsArray()
  @IsOptional()
  packages?: string[];
}
