import { IsString } from 'class-validator';

export class PairRequestDto {
  // Accepted with or without the display dash ("482-931" or "482931") —
  // the service strips all non-digit characters before matching.
  @IsString()
  pairingCode: string;
}
