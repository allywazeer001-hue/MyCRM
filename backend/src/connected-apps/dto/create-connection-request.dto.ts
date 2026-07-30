import { IsArray, IsEmail, IsOptional, IsString, IsUrl } from 'class-validator';

export class CreateConnectionRequestDto {
  @IsString()
  organizationSlug: string;

  @IsString()
  appName: string;

  @IsUrl({ require_tld: false })
  appUrl: string;

  @IsString()
  @IsOptional()
  appLogoUrl?: string;

  @IsString()
  developerName: string;

  @IsEmail()
  @IsOptional()
  developerEmail?: string;

  @IsArray()
  requestedScopes: string[];

  @IsUrl({ require_tld: false })
  redirectUrl: string;

  @IsString()
  @IsOptional()
  publicKey?: string;
}
