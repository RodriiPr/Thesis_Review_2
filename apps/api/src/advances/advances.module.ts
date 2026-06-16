import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '../prisma/prisma.module';
import { AdvancesController } from './advances.controller';
import { AdvancesService } from './advances.service';

@Module({
  imports: [PrismaModule, BullModule.registerQueue({ name: 'ai-analysis' })],
  controllers: [AdvancesController],
  providers: [AdvancesService],
  exports: [AdvancesService],
})
export class AdvancesModule {}
