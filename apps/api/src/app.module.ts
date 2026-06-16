import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AdvancesModule } from './advances/advances.module';
import { AiAnalysisModule } from './ai-analysis/ai-analysis.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ChatbotModule } from './chatbot/chatbot.module';
import { FineTuningModule } from './fine-tuning/fine-tuning.module';
import { NotificationsModule } from './notifications/notifications.module';
import { OrcidModule } from './orcid/orcid.module';
import { PlagiarismModule } from './plagiarism/plagiarism.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProgramsModule } from './programs/programs.module';
import { ReferencesModule } from './references/references.module';
import { ReportsModule } from './reports/reports.module';
import { ReviewsModule } from './reviews/reviews.module';
import { UsersModule } from './users/users.module';
import { StatsModule } from './stats/stats.module';
import { StorageModule } from './storage/storage.module';
import { TemplatesModule } from './templates/templates.module';
import { PipelineModule } from './pipeline/pipeline.module';
import { ThesisGeneratorModule } from './thesis-generator/thesis-generator.module';
import { SchemesModule } from './schemes/schemes.module';
import { TemplateDocumentModule } from './template-document/template-document.module';



@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../.env', '.env'],
    }),
    BullModule.forRoot({
        connection: process.env.REDIS_URL
        ? {
            url: process.env.REDIS_URL,
            // Muchos proveedores en la nube (como Render Redis o Upstash) requieren TLS activo
            tls: process.env.REDIS_USE_TLS === 'false' ? undefined : {}, 
          }
        : {
            host: process.env.REDIS_HOST ?? 'localhost',
            port: Number(process.env.REDIS_PORT ?? 6379),
            password: process.env.REDIS_PASSWORD,
            tls: process.env.REDIS_USE_TLS === 'true' ? {} : undefined,
          },
    }),
    EventEmitterModule.forRoot(),
    PrismaModule,
    StorageModule,
    NotificationsModule,
    OrcidModule,
    AuthModule,
    ProgramsModule,
    TemplatesModule,
    AdvancesModule,
    ReviewsModule,
    StatsModule,
    AiAnalysisModule,
    ChatbotModule,
    PlagiarismModule,
    ReferencesModule,
    ReportsModule,
    UsersModule,
    FineTuningModule,
    ThesisGeneratorModule,
    SchemesModule,
    TemplateDocumentModule,
    PipelineModule,

  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
