import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { FineTuningController } from './fine-tuning.controller';

@Module({
  imports: [PrismaModule],
  controllers: [FineTuningController],
})
export class FineTuningModule {}
