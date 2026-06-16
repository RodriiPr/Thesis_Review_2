import { Module } from '@nestjs/common';
import { SchemesService } from './schemes.service';
import { SchemesController } from './schemes.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { StructureExtractor } from './utils/structure-extractor';

@Module({
  imports: [PrismaModule],
  controllers: [SchemesController],
  providers: [SchemesService, StructureExtractor],
  exports: [SchemesService],
})
export class SchemesModule {}
