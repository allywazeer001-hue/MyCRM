import { IsEmail, IsString, MinLength, IsObject } from 'class-validator';

export class RecoveryStartDto {
  @IsEmail()
  email: string;
}

export class RecoveryVerifyDto {
  @IsString()
  challengeId: string;

  @IsObject()
  answers: Record<string, string>;
}

export class RecoveryResetDto {
  @IsString()
  challengeId: string;

  @IsString()
  resetToken: string;

  @IsString()
  @MinLength(8)
  newPassword: string;
}
