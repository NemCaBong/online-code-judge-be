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
import { CurrentUser } from 'src/decorators/current-user.decorator';
import { User } from 'src/users/user.entity';

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
    // const { acSubmissionCount, allChallengesCount } =
    //   await this.challengesService.countAllChallengesAndUsersSubmitted(userId);
    const challenges =
      await this.challengesService.getAllChallengesWithUserStatus(userId);
    const doneEasy =
      await this.challengesService.getTotalDoneEasyChalenges(userId);
    const todos = await this.challengesService.getTodoChallenges(userId);
    return {
      data: {
        challenges,
        todos,
        doneEasy,
      },
    };
  }

  @Get('/info/done-and-total')
  async getDoneAndTotalChallenges(@CurrentUser() user: User) {
    const [done, total] = await Promise.all([
      this.challengesService.getDoneChallenges(user.id),
      this.challengesService.getTotalChallenges(),
    ]);
    return {
      message: 'Success',
      statusCode: 200,
      done,
      total,
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
    const result =
      await this.challengesService.createChallenge(createChallengeDto);
    return {
      message: 'Success',
      statusCode: 201,
      result: { id: result.id },
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

  @Post('poll-submit')
  async pollSubmitCode(
    // @Param('challengeSlug') challengeSlug: string,
    @Body() submitPollDto: SubmitPollDto,
  ) {
    return await this.challengesService.pollingForSubmission(
      // challengeSlug,
      submitPollDto,
    );
  }

  @Get('/info/done-and-total-medium')
  async getDoneAndTotalMediumChallenges(@CurrentUser() user: User) {
    const [done, total] = await Promise.all([
      this.challengesService.getTotalDoneMediumChalenges(user.id),
      this.challengesService.getTotalMediumChallenges(),
    ]);
    return {
      message: 'Success',
      status_code: 200,
      done,
      total,
    };
  }

  @Get('/info/done-and-total-hard')
  async getDoneAndTotalHardChallenges(@CurrentUser() user: User) {
    const [done, total] = await Promise.all([
      this.challengesService.getTotalDoneHardChalenges(user.id),
      this.challengesService.getTotalHardChallenges(),
    ]);
    return {
      message: 'Success',
      status_code: 200,
      done,
      total,
    };
  }

  @Get('/info/done-and-total-easy')
  async getDoneAndTotalEasyChallenges(@CurrentUser() user: User) {
    const [done, total] = await Promise.all([
      this.challengesService.getTotalDoneEasyChalenges(user.id),
      this.challengesService.getTotalEasyChallenges(),
    ]);
    return {
      message: 'Success',
      status_code: 200,
      done,
      total,
    };
  }

  @Get('/to-do/all')
  async getTodoChallenges(@CurrentUser() user: User) {
    const todos = await this.challengesService.getTodoChallenges(user.id);
    return {
      message: 'Success',
      status_code: 200,
      todos,
    };
  }

  @Get('users/list')
  async getChallengesWithUserStatus(@CurrentUser() user: User) {
    const challenges =
      await this.challengesService.getAllChallengesWithUserStatus(user.id);
    return {
      message: 'Success',
      status_code: 200,
      challenges,
    };
  }
}
