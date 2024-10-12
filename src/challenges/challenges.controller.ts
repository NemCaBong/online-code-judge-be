import { Controller, Get, Query, Req } from '@nestjs/common';
import { ChallengesService } from './challenges.service';

@Controller('challenges')
export class ChallengesController {
  constructor(private readonly challengesService: ChallengesService) {}

  @Get('hi')
  async getAllChallenges(
    @Query() query: { page?: number; limit?: number },
    @Req() req,
  ) {
    const page = query.page ? Number(query.page) : 1;
    const limit = query.limit ? Number(query.limit) : 10;
    const userId = req.user.id;
    const { acSubmissionCount, allChallengesCount } =
      await this.challengesService.countAllChallengesAndUsersSubmitted(userId);
    const challenges =
      await this.challengesService.getAllChallengesWithUserStatus(
        userId,
        page,
        limit,
      );
    return {
      data: {
        acSubmissionCount,
        allChallengesCount,
        challenges,
      },
    };
  }
}
