import { Module } from '@nestjs/common';
import { LandingConfigService } from './landing-config.service';
import { LandingConfigController, PublicLandingConfigController } from './landing-config.controller';

@Module({
  controllers: [LandingConfigController, PublicLandingConfigController],
  providers: [LandingConfigService],
})
export class LandingConfigModule {}
