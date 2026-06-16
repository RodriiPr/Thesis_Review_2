import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { OrcidService } from './orcid.service';
import { OrcidController } from './orcid.controller';

@Module({
  imports: [PrismaModule],
  controllers: [OrcidController],
  providers: [OrcidService],
  exports: [OrcidService],
})
export class OrcidModule {}
