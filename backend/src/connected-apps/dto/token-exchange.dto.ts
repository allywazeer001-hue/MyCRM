import { IsIn, IsOptional, IsString } from 'class-validator';

export class TokenExchangeDto {
  @IsIn(['authorization_code', 'refresh_token'])
  grant_type: 'authorization_code' | 'refresh_token';

  @IsString()
  client_id: string;

  @IsString()
  client_secret: string;

  @IsString()
  @IsOptional()
  code?: string;

  @IsString()
  @IsOptional()
  refresh_token?: string;
}

export class RevokeTokenDto {
  @IsString()
  client_id: string;

  @IsString()
  client_secret: string;

  @IsString()
  token: string;
}
