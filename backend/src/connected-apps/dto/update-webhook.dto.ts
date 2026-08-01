import { IsOptional, IsString, MaxLength } from 'class-validator';

// webhookUrl: '' clears it (disables delivery). webhookSecret: omitted/blank
// means "leave the currently stored secret alone" — it's never re-displayed
// after being saved, so there's no way for the admin to resubmit the same
// value, and a blank field on an unrelated edit (e.g. just fixing the URL)
// must not wipe it.
export class UpdateWebhookDto {
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  webhookUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  webhookSecret?: string;
}
