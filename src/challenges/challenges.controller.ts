import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { ChallengesService } from './challenges.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { CreateChallengeDto } from './dtos/create-challenge.dto';
import { RunChallengeDto } from './dtos/run-challenge.dto';
import { RunPollDataDto, RunPollDto } from './dtos/run-poll.dto';
import { SubmitPollDto } from './dtos/submit-poll.dto';
import { SubmitChallengeDto } from './dtos/submit-challenge.dto';

@Controller('challenges')
export class ChallengesController {
  constructor(private readonly challengesService: ChallengesService) {}

  @Get('hi')
  async getAllChallenges(
    @Query() query: { page?: number; limit?: number },
    @Req() req: any,
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
    const todos = await this.challengesService.getTodoChallenges(userId);
    return {
      data: {
        acSubmissionCount,
        allChallengesCount,
        challenges,
        todos,
      },
    };
  }

  @Get('done-and-total-challenges/:id')
  async getDoneAndTotalChallenges(
    @Param('id') userId: number,
  ): Promise<{ doneChallenges: number; totalChallenges: number }> {
    const [doneChallenges, totalChallenges] = await Promise.all([
      this.challengesService.getDoneChallenges(userId),
      this.challengesService.getTotalChallenges(),
    ]);
    return {
      doneChallenges,
      totalChallenges,
    };
  }

  @Post('upload/test-cases')
  @UseInterceptors(FileInterceptor('testCasesFile'))
  async uploadTestCases(
    @UploadedFile() testCasesFile: Express.Multer.File,
    @Query('challenge_id', ParseIntPipe) challengeId: number,
  ): Promise<object> {
    if (!testCasesFile) {
      return {
        message: 'Test cases file is required',
        statusCode: 400,
      };
    }
    await this.challengesService.uploadTestCases(testCasesFile, challengeId);
    return {
      message: 'Challenge created successfully',
      statusCode: 201,
    };
  }

  @Post('create')
  async createChallenge(
    @Body() createChallengeDto: CreateChallengeDto,
  ): Promise<object> {
    await this.challengesService.createChallenge(createChallengeDto);
    return {
      message: 'Challenge created successfully',
      statusCode: 201,
    };
  }

  @Get(':challengeSlug')
  async getChallengeBySlug(@Param('challengeSlug') challengeSlug: string) {
    return await this.challengesService.getChallenge(challengeSlug);
  }

  @Post(':challengeSlug/run')
  async runCode(
    @Param('challengeSlug') challengeSlug: string,
    @Body() runChallengeDto: RunChallengeDto,
  ) {
    return await this.challengesService.runChallengeTests(
      challengeSlug,
      runChallengeDto,
    );
  }

  @Post('poll-run')
  async pollRunCode(@Body() runPollDto: RunPollDto) {
    return await this.challengesService.pollingForRunning(runPollDto);
  }

  @Post(':challengeSlug/submit')
  async submitCode(
    @Param('challengeSlug') challengeSlug: string,
    @Body() submitChallengeDto: SubmitChallengeDto,
  ) {
    return await this.challengesService.submitChallenge(
      challengeSlug,
      submitChallengeDto,
    );
  }

  @Post(':challengeSlug/submit-poll')
  async pollSubmitCode(
    @Param('challengeSlug') challengeSlug: string,
    @Body() submitPollDto: SubmitPollDto,
  ) {
    return await this.challengesService.pollingForSubmission(
      challengeSlug,
      submitPollDto,
    );
  }
}
