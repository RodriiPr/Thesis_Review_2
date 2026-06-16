import { Body, Controller, Get, Param, Post, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ReviewsService } from './reviews.service';

@Controller('reviews')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReviewsController {
  constructor(private reviewsService: ReviewsService) {}

  @Get('panel/:advanceId')
  @Roles('ADVISOR', 'COORDINATOR', 'ADMIN', 'STUDENT')
  getPanel(@Param('advanceId') advanceId: string) {
    return this.reviewsService.getReviewPanel(advanceId);
  }

  @Post(':advanceId')
  @Roles('ADVISOR', 'COORDINATOR', 'ADMIN')
  saveReview(
    @Param('advanceId') advanceId: string,
    @Body()
    body: {
      finalGrade?: number;
      humanComment?: string;
      rubricAnswers?: Record<string, boolean>;
      status: 'OBSERVED' | 'APPROVED' | 'REJECTED';
    },
    @Request() req: { user: { id: string } },
  ) {
    return this.reviewsService.saveHumanReview({
      advanceId,
      reviewerId: req.user.id,
      ...body,
    });
  }
}
