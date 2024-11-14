import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Challenge } from './entities/challenge.entity';
import { DataSource, In, LessThanOrEqual, Repository } from 'typeorm';
import { UserChallengeResult } from './entities/user-challenge-result.entity';
import * as AdmZip from 'adm-zip';
import { TestCase } from './entities/test-case.entity';
import { CreateChallengeDto } from './dtos/create-challenge.dto';
import slugify from 'slugify';
import { Hint } from './entities/hint.entity';
import { Tag } from 'src/tags/entities/tag.entity';
import { ChallengeTag } from './entities/challenge-tag.entity';
import axios from 'axios';
import { RunChallengeDto } from './dtos/run-challenge.dto';
import { RunPollDto } from './dtos/run-poll.dto';
import { SubmitPollDto } from './dtos/submit-poll.dto';
import { Judge0Status } from 'src/common/enums/judge0-status.enum';
import { SubmitChallengeDto } from './dtos/submit-challenge.dto';
import { Judge0StatusDescription, LANGUAGE_MAP } from 'src/common/constants';
import { DifficultyEnum } from 'src/common/enums/difficulty.enum';
import { ChallengeResultStatusEnum } from 'src/common/enums/challenge-status.enum';
import { TodoChallenge } from 'src/todo-challenge/entities/todo-challenge.entity';
import { TodoChallengeService } from 'src/todo-challenge/todo-challenge.service';
import { ChallengeDetail } from './entities/challenge-detail.entity';
import callJudgeServer from 'src/utils/call-judge-server';

@Injectable()
export class ChallengesService {
  constructor(
    @InjectRepository(Challenge)
    private readonly challengesRepo: Repository<Challenge>,
    @InjectRepository(UserChallengeResult)
    private readonly userChallengeResultsRepo: Repository<UserChallengeResult>,
    @InjectRepository(TestCase)
    private readonly testCaseRepo: Repository<TestCase>,
    @InjectRepository(TodoChallenge)
    private readonly todoChallengeRepo: Repository<TodoChallenge>,
    private readonly dataSource: DataSource,
    private readonly todoChallengeService: TodoChallengeService,
  ) {}

  async getAllChallenges(page: number = 1, limit: number = 10) {
    const queryBuilder = this.challengesRepo.createQueryBuilder('challenge');

    const [challenges, total] = await queryBuilder
      .where('challenge.is_deleted = :isDeleted', { isDeleted: false })
      .orderBy('challenge.created_at', 'DESC')
      .take(limit)
      .skip((page - 1) * limit)
      .getManyAndCount();

    return {
      data: challenges,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getAllChallengesWithUserStatus(userId: number) {
    const queryBuilder = this.challengesRepo
      .createQueryBuilder('c')
      .leftJoinAndSelect(
        'c.user_challenge_results',
        'ucr',
        'ucr.user_id = :userId',
        { userId },
      )
      .leftJoinAndSelect('c.tags', 'tags')
      .select([
        'c.id',
        'c.name',
        'c.difficulty',
        'c.slug',
        'c.created_at',
        'tags.id',
        'tags.name',
        'ucr.status',
        'c.accepted_results',
        'c.total_attempts',
      ])
      .where('c.is_deleted = :isDeleted', { isDeleted: false })
      .orderBy('c.created_at', 'DESC');
    const challenges = await queryBuilder.getMany();
    return challenges;
  }

  async countAllChallengesAndUsersSubmitted(userId: number) {
    const [challengesByDifficulty, usersSubmittedByDifficulty] =
      await Promise.all([
        this.challengesRepo
          .createQueryBuilder('challenge')
          .select('challenge.difficulty, COUNT(challenge.id)', 'total')
          .groupBy('challenge.difficulty')
          .getRawMany(),
        this.userChallengeResultsRepo
          .createQueryBuilder('ucr')
          .innerJoin(Challenge, 'challenge', 'challenge.id = ucr.challenge_id')
          .select('challenge.difficulty, COUNT(ucr.id)', 'total')
          .where('ucr.code IS NOT NULL')
          .andWhere('ucr.user_id = :userId', { userId })
          .groupBy('challenge.difficulty')
          .getRawMany(),
      ]);

    // parse the total to number
    usersSubmittedByDifficulty.forEach((diff) => {
      diff.total = parseInt(diff.total);
    });
    challengesByDifficulty.forEach((diff) => {
      diff.total = parseInt(diff.total);
    });

    // Add missing difficulties to usersSubmittedByDifficulty array
    const diffsInUsersSubmitted = usersSubmittedByDifficulty.map(
      (diff) => diff.difficulty,
    );
    ['HARD', 'EASY', 'MEDIUM'].forEach((difficulty) => {
      if (!diffsInUsersSubmitted.includes(difficulty)) {
        usersSubmittedByDifficulty.push({
          difficulty,
          total: 0,
        });
      }
    });
    return {
      allChallengesCount: challengesByDifficulty,
      acSubmissionCount: usersSubmittedByDifficulty,
    };
  }

  async getTodoChallenges(userId: number) {
    const todos = await this.todoChallengeRepo
      .createQueryBuilder('tc')
      .innerJoinAndSelect('tc.challenge', 'c')
      .select([
        'tc.id',
        'c.id',
        'c.name',
        'c.slug',
        'c.difficulty',
        'tc.created_at',
        'tc.is_done',
      ])
      .where('tc.user_id = :userId', { userId })
      .orderBy('tc.created_at', 'DESC')
      .getMany();

    return todos;
  }

  async getDoneChallenges(userId: number): Promise<number> {
    const totalChallenges = await this.userChallengeResultsRepo
      .createQueryBuilder('ucr')
      .innerJoin('ucr.challenge', 'challenge')
      .where('ucr.user_id = :userId', { userId })
      .andWhere('ucr.status = :status', {
        status: ChallengeResultStatusEnum.DONE,
      })
      .select('COUNT(DISTINCT ucr.challenge_id)', 'total')
      .getRawOne();

    return parseInt(totalChallenges.total, 10);
  }

  async getTotalChallenges(): Promise<number> {
    return await this.challengesRepo.createQueryBuilder('c').getCount();
  }

  async uploadTestCases(
    testCasesFile: Express.Multer.File,
    challengeId: number,
  ): Promise<object> {
    const { fieldname, buffer } = testCasesFile;
    const zip = new AdmZip(buffer);
    const zipEntries = zip.getEntries();

    const inputFiles = [];
    const outputFiles = [];

    zipEntries.forEach((zipEntry) => {
      const entryName = zipEntry.entryName;
      if (entryName.startsWith(`${fieldname}/input/`)) {
        const fileData = zipEntry.getData();
        const content = fileData.toString();
        if (content) {
          inputFiles.push(content);
        }
      } else if (entryName.startsWith(`${fieldname}/output/`)) {
        const fileData = zipEntry.getData();
        const content = fileData.toString();
        if (content) {
          outputFiles.push(content);
        }
      }
    });

    // Ensure input and output files are paired correctly
    if (inputFiles.length !== outputFiles.length) {
      throw new BadRequestException('Mismatch between input and output files');
    }

    // Save test cases to the database
    const testCases = inputFiles.map((input, index) => {
      const testCase = new TestCase();
      testCase.input = input;
      testCase.expected_output = outputFiles[index];
      testCase.challenge_id = challengeId;
      return testCase;
    });
    // console.log(testCases);
    await this.testCaseRepo.save(testCases);

    return {
      message: 'Challenge created successfully',
      statusCode: 201,
    };
  }

  async createChallenge(
    createChallengeDto: CreateChallengeDto,
  ): Promise<Challenge> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Create the challenge
      const challenge = new Challenge();
      challenge.name = createChallengeDto.name;
      challenge.description = createChallengeDto.markdownContent;
      challenge.difficulty = createChallengeDto.difficulty;
      challenge.slug = slugify(createChallengeDto.name, { lower: true });
      challenge.space_limit = createChallengeDto.spaceLimit;
      challenge.time_limit = createChallengeDto.timeLimit;

      const savedChallenge = await queryRunner.manager.save(challenge);

      // Save hints
      const hints = createChallengeDto.hints.map((hintDto) => {
        const hint = new Hint();
        hint.question = hintDto.hintQuestion;
        hint.answer = hintDto.hintAnswer;
        hint.challenge_id = savedChallenge.id;
        return hint;
      });

      // Save tags
      const tags = createChallengeDto.tags.map((tagDto) => {
        const challengeTag = new ChallengeTag();
        challengeTag.tag_id = tagDto.id;
        challengeTag.challenge_id = savedChallenge.id;
        return challengeTag;
      });

      // Save boilerplate codes
      const boilerplateCodes = createChallengeDto.boilerplate_codes.map(
        (boilerplateDto) => {
          const challengeDetail = new ChallengeDetail();
          challengeDetail.language_id =
            LANGUAGE_MAP[boilerplateDto.language.toLowerCase()];
          challengeDetail.boilerplate_code = boilerplateDto.code;
          challengeDetail.challenge_id = savedChallenge.id;
          return challengeDetail;
        },
      );

      await Promise.all([
        queryRunner.manager.save(hints),
        queryRunner.manager.save(tags),
        queryRunner.manager.save(boilerplateCodes),
      ]);

      await queryRunner.commitTransaction();
      return savedChallenge;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getChallenge(challengeSlug: string) {
    const queryBuilder = this.challengesRepo.createQueryBuilder('challenge');

    const challenge = await queryBuilder
      .leftJoinAndSelect('challenge.hints', 'hints', 'hints.is_deleted = false')
      .leftJoinAndSelect('challenge.tags', 'tags', 'tags.is_deleted = false')
      .leftJoinAndSelect('challenge.test_cases', 'tc', 'tc.is_sampled = true')
      .leftJoinAndSelect('challenge.challenge_details', 'cd')
      .where('challenge.slug = :slug', { slug: challengeSlug })
      .select([
        'challenge.id',
        'challenge.name',
        'challenge.description',
        'challenge.difficulty',
        'challenge.space_limit',
        'challenge.time_limit',
        'hints.id',
        'hints.question',
        'hints.answer',
        'tags.id',
        'tags.name',
        'tc.id',
        'tc.input',
        'tc.expected_output',
        'cd.id',
        'cd.language_id',
        'cd.boilerplate_code',
      ])
      .getOne();

    if (challenge && challenge.test_cases) {
      // Sort test cases by their id
      challenge.test_cases.sort((a, b) => a.id - b.id);
    }

    return challenge;
  }

  async runChallengeTests(
    challenge_slug: string,
    runChallengeDto: RunChallengeDto,
  ) {
    const challenge = await this.challengesRepo
      .createQueryBuilder('challenge')
      .where('challenge.slug = :slug', { slug: challenge_slug })
      .getOne();

    if (!challenge) {
      throw new BadRequestException('Challenge not found');
    }

    // Fetch test cases by IDs
    const testCases = await this.testCaseRepo.find({
      where: {
        id: In(runChallengeDto.testCaseIds),
      },
    });

    if (testCases.length === 0) {
      throw new BadRequestException('No test cases found for the provided IDs');
    }

    // Sort test cases by their id
    testCases.sort((a, b) => a.id - b.id);

    const { code, languageId } = runChallengeDto;
    const submissions = testCases.map((testCase) => {
      const input = Buffer.from(testCase.input).toString('base64');
      const expectedOutput = Buffer.from(testCase.expected_output).toString(
        'base64',
      );
      const encodedCode = Buffer.from(code).toString('base64');

      return {
        source_code: encodedCode,
        stdin: input,
        expected_output: expectedOutput,
        language_id: languageId,
        cpu_time_limit: challenge.time_limit,
        memory_limit: challenge.space_limit,
      };
    });

    // console.log(submissions);

    try {
      const response = await axios.post(
        `http://${process.env.NODE_ENV === 'production' ? 'judge0_server' : 'localhost'}:2358/submissions/batch?base64_encoded=true`,
        {
          submissions,
        },
        {
          headers: {
            'X-Auth-Token': 't2UFBewPFQcqnMwPaPmmBChpy7P9T6tT',
          },
        },
      );
      console.log(submissions);

      // Combine tokens with test case IDs
      const result = response.data.map((item, index) => ({
        token: item.token,
        testCaseId: testCases[index].id,
      }));

      return { message: 'Success', result };
    } catch (error) {
      throw new BadRequestException(
        `Error processing submissions: ${error.message}`,
      );
    }
  }

  async pollingForRunning(runPollDto: RunPollDto) {
    try {
      // sort runPollDto by testCaseId
      runPollDto.runPoll.sort((a, b) => a.testCaseId - b.testCaseId);

      const tokens = runPollDto.runPoll.map((item) => item.token).join(',');
      const response = await axios.get(
        `http://${process.env.NODE_ENV === 'production' ? 'judge0_server' : 'localhost'}:2358/submissions/batch?tokens=${tokens}&base64_encoded=true`,
        {
          headers: {
            'X-Auth-Token': 't2UFBewPFQcqnMwPaPmmBChpy7P9T6tT',
          },
        },
      );
      const submissions = response.data.submissions;

      // Check if any submission is still pending
      const pendingSubmission = submissions.find((submission) => {
        const statusId = submission.status?.id;
        return (
          statusId === Judge0Status.IN_QUEUE ||
          statusId === Judge0Status.PROCESSING
        );
      });

      if (pendingSubmission) {
        return {
          message: 'Pending',
          statusCode: 202,
        };
      }
      const testCaseIds = runPollDto.runPoll.map((item) => item.testCaseId);
      const testCases = await this.testCaseRepo.find({
        where: { id: In(testCaseIds) },
      });

      // Check for specific error codes
      for (const submission of submissions) {
        const statusId = submission.status?.id;
        const testCaseId = runPollDto.runPoll.find(
          (item) => item.token === submission.token,
        )?.testCaseId;
        const testCase = testCases.find((tc) => tc.id === testCaseId);
        if (statusId >= 5 && statusId <= 14) {
          const { stdout, stderr, compile_output, ...submissionData } =
            submission;

          return {
            message: 'Error',
            error: Judge0StatusDescription[statusId],
            statusCode: 400,
            submission: {
              stderr: stderr
                ? Buffer.from(stderr, 'base64').toString('utf-8')
                : null,
              stdout: stdout
                ? Buffer.from(stdout, 'base64').toString('utf-8')
                : null,
              compile_output: compile_output
                ? Buffer.from(compile_output, 'base64').toString('utf-8')
                : null,
              ...submissionData,
            },
            errorTestCase: testCase,
          };
        }
      }
      // Process the results
      const results = submissions.map((submission) => {
        const { stdout, stderr, compile_output, ...submissionData } =
          submission;
        return {
          stderr: stderr
            ? Buffer.from(stderr, 'base64').toString('utf-8')
            : null,
          stdout: stdout
            ? Buffer.from(stdout, 'base64').toString('utf-8')
            : null,
          compile_output: compile_output
            ? Buffer.from(compile_output, 'base64').toString('utf-8')
            : null,
          ...submissionData,
        };
      });

      // Check for WRONG_ANSWER status
      const wrongAnswer = submissions.find(
        (submission) => submission.status?.id === Judge0Status.WRONG_ANSWER,
      );
      if (wrongAnswer) {
        return {
          message: 'Error',
          error: Judge0StatusDescription[Judge0Status.WRONG_ANSWER],
          statusCode: 400,
          submissions: results,
        };
      }
      // If Accepted, return the results
      return { message: 'Success', submissions: results, statusCode: 200 };
    } catch (error) {
      throw new BadRequestException(
        `Error polling submissions: ${error.message}`,
      );
    }
  }

  async submitChallenge(
    challengeSlug: string,
    submitChallengeDto: SubmitChallengeDto,
    userId: number,
  ) {
    const { code, languageId } = submitChallengeDto;

    // Fetch the challenge by slug
    const challenge = await this.challengesRepo
      .createQueryBuilder('challenge')
      .where('challenge.slug = :slug', { slug: challengeSlug })
      .getOne();

    if (!challenge) {
      throw new BadRequestException('Challenge not found');
    }

    // Fetch all test cases for the challenge
    const testCases = await this.testCaseRepo.find({
      where: { challenge_id: challenge.id },
    });

    if (testCases.length === 0) {
      throw new BadRequestException('No test cases found for this challenge');
    }
    testCases.sort((a, b) => a.id - b.id);
    // Prepare submissions for Judge0 API
    const submissions = testCases.map((testCase) => {
      const input = Buffer.from(testCase.input).toString('base64');
      const expectedOutput = Buffer.from(testCase.expected_output).toString(
        'base64',
      );
      const encodedCode = Buffer.from(code).toString('base64');

      return {
        source_code: encodedCode,
        stdin: input,
        expected_output: expectedOutput,
        language_id: languageId,
        cpu_time_limit: challenge.time_limit,
        memory_limit: challenge.space_limit,
      };
    });

    try {
      // Send submissions to Judge0 API
      const response = await axios.post(
        `http://${process.env.NODE_ENV === 'production' ? 'judge0_server' : 'localhost'}:2358/submissions/batch?base64_encoded=true`,
        { submissions },
        {
          headers: {
            'X-Auth-Token': 't2UFBewPFQcqnMwPaPmmBChpy7P9T6tT',
          },
        },
      );

      // Extract tokens from the response
      const tokens = response.data.map((item) => item.token);
      const res = testCases.map((testCase, index) => {
        return {
          token: tokens[index],
          testCaseId: testCase.id,
        };
      });
      const userChallRes = this.userChallengeResultsRepo.create({
        challenge_id: challenge.id,
        user_id: userId,
        status: ChallengeResultStatusEnum.PENDING,
        code: code,
        language_id: languageId,
        created_at: new Date(),
        status_id: Judge0Status.IN_QUEUE,
      });

      await this.userChallengeResultsRepo.save(userChallRes);

      return {
        message: 'Success',
        result: res,
        user_challenge_id: userChallRes.id,
      };
    } catch (error) {
      throw new BadRequestException(
        `Error processing submissions: ${error.message}`,
      );
    }
  }

  async pollingForSubmission(
    challengeSlug: string,
    submitPollDto: SubmitPollDto,
    userId: number,
    userChallengeId: number,
  ) {
    // check if userChallengeId is valid
    const userChallenge = await this.userChallengeResultsRepo.findOne({
      where: { id: userChallengeId },
    });
    const chall = await this.challengesRepo.findOne({
      where: { slug: challengeSlug },
    });

    if (
      !userChallenge ||
      !chall ||
      chall.id != userChallenge.challenge_id ||
      !userId ||
      userChallenge.user_id != userId
    ) {
      throw new BadRequestException('Not found the submission');
    }

    // sort submitPollDto by testCaseId
    submitPollDto.submitPoll.sort((a, b) => a.testCaseId - b.testCaseId);
    const { submitPoll } = submitPollDto;
    const tokens = submitPoll.map((item) => item.token).join(',');
    const response = await axios.get(
      `http://${process.env.NODE_ENV === 'production' ? 'judge0_server' : 'localhost'}:2358/submissions/batch?tokens=${tokens}&base64_encoded=true`,
      {
        headers: {
          'X-Auth-Token': 't2UFBewPFQcqnMwPaPmmBChpy7P9T6tT',
        },
      },
    );
    const submissions = response.data.submissions;

    // Check for pending submissions
    const pendingSubmission = submissions.find(
      (submission) => submission.status.id === 1 || submission.status.id === 2,
    );
    if (pendingSubmission) {
      return {
        message: 'Pending',
        statusCode: 202,
      };
    }
    const testCaseIds = submitPoll.map((item) => item.testCaseId);
    const testCases = await this.testCaseRepo.find({
      where: { id: In(testCaseIds) },
    });

    // Check for errors
    for (const submission of submissions) {
      const id = submission.status.id;
      if (id >= 4 && id <= 14) {
        const failedTestCase = submitPoll.find(
          (item) => item.token === submission.token,
        );
        const testCase = testCases.find(
          (tc) => tc.id === failedTestCase?.testCaseId,
        );
        const {
          stdout,
          stderr,
          compile_output,
          message,
          time,
          memory,
          ...submissionData
        } = submission;
        const decodedStdout = stdout
          ? Buffer.from(stdout, 'base64').toString()
          : null;
        const decodedStderr = stderr
          ? Buffer.from(stderr, 'base64').toString()
          : null;
        const decodedCompileOutput = compile_output
          ? Buffer.from(compile_output, 'base64').toString()
          : null;

        // Update userChallengeResult with the error message
        // and increase total_attempts
        await Promise.all([
          this.challengesRepo
            .createQueryBuilder()
            .update(Challenge)
            .where({
              id: chall.id,
            })
            .set({ total_attempts: () => 'total_attempts + 1' })
            .execute(),
          this.userChallengeResultsRepo.update(
            { id: userChallenge.id },
            {
              status: ChallengeResultStatusEnum.FAILED,
              status_id: submission.status.id || 4,
              message: Judge0StatusDescription[submission.status.id || 4],
              stderr: decodedStderr,
              stdout: decodedStdout,
              compile_output: decodedCompileOutput,
              testcase_id: testCase.id,
              time,
              memory,
            },
          ),
        ]);
        return {
          message: 'Error',
          error: Judge0StatusDescription[id],
          statusCode: 400,
          submission: {
            stdout: decodedStdout,
            stderr: decodedStderr,
            compile_output: decodedCompileOutput,
            message: message
              ? Buffer.from(message, 'base64').toString('utf-8')
              : null,
            ...submissionData,
            time,
            memory,
          },
          errorTestCase: testCase,
        };
      }
    }

    // Calculate average time and memory if all submissions are successful
    const totalTime = submissions.reduce(
      (acc: number, submission) => acc + parseFloat(submission.time),
      0,
    );
    const totalMemory = submissions.reduce(
      (acc: number, submission) => acc + parseFloat(submission.memory),
      0,
    );
    const averageTime = totalTime / submissions.length;
    const averageMemory = totalMemory / submissions.length;

    // Update userChallengeResult with the average time and memory
    // and increase total_attempts
    await Promise.all([
      this.challengesRepo
        .createQueryBuilder()
        .update(Challenge)
        .where({
          id: chall.id,
        })
        .set({
          accepted_results: () => 'accepted_results + 1',
          total_attempts: () => 'total_attempts + 1',
        })
        .execute(),
      this.userChallengeResultsRepo.update(
        { id: userChallengeId },
        {
          time: averageTime,
          memory: Math.round(averageMemory),
          status: ChallengeResultStatusEnum.DONE,
          status_id: Judge0Status.ACCEPTED,
          message: Judge0StatusDescription[Judge0Status.ACCEPTED],
        },
      ),
      this.todoChallengeService.markedAsDoneIfExists(chall.id, userId),
    ]);

    // store the total
    return {
      message: 'Success',
      averageTime: Number(averageTime.toFixed(3)),
      averageMemory,
      statusCode: 200,
    };
  }

  async getTotalMediumChallenges() {
    const totalChallenges = await this.challengesRepo.count({
      where: { difficulty: DifficultyEnum.MEDIUM },
    });
    return totalChallenges;
  }

  async getTotalHardChallenges() {
    const totalChallenges = await this.challengesRepo.count({
      where: { difficulty: DifficultyEnum.HARD },
    });
    return totalChallenges;
  }

  async getTotalEasyChallenges() {
    const totalChallenges = await this.challengesRepo.count({
      where: { difficulty: DifficultyEnum.EASY },
    });
    return totalChallenges;
  }

  async getTotalDoneMediumChallenges(userId: number) {
    const totalChallenges = await this.userChallengeResultsRepo
      .createQueryBuilder('ucr')
      .innerJoin('ucr.challenge', 'challenge')
      .where('ucr.user_id = :userId', { userId })
      .andWhere('challenge.difficulty = :difficulty', {
        difficulty: DifficultyEnum.MEDIUM,
      })
      .andWhere('ucr.status = :status', {
        status: ChallengeResultStatusEnum.DONE,
      })
      .groupBy('ucr.challenge_id')
      .getCount();
    return totalChallenges;
  }

  async getTotalDoneHardChallenges(userId: number) {
    const totalChallenges = await this.userChallengeResultsRepo
      .createQueryBuilder('ucr')
      .innerJoin('ucr.challenge', 'challenge')
      .where('ucr.user_id = :userId', { userId })
      .andWhere('challenge.difficulty = :difficulty', {
        difficulty: DifficultyEnum.HARD,
      })
      .andWhere('ucr.status = :status', {
        status: ChallengeResultStatusEnum.DONE,
      })
      .select('COUNT(DISTINCT ucr.challenge_id)', 'total')
      .getRawOne();

    return parseInt(totalChallenges.total, 10);
  }

  async getTotalDoneEasyChallenges(userId: number) {
    const totalChallenges = await this.userChallengeResultsRepo
      .createQueryBuilder('ucr')
      .innerJoin('ucr.challenge', 'challenge')
      .where('ucr.user_id = :userId', { userId })
      .andWhere('challenge.difficulty = :difficulty', {
        difficulty: DifficultyEnum.EASY,
      })
      .andWhere('ucr.status = :status', {
        status: ChallengeResultStatusEnum.DONE,
      })
      .select('COUNT(DISTINCT ucr.challenge_id)', 'total')
      .getRawOne();

    return parseInt(totalChallenges.total, 10);
  }

  async countUntilLastMonth(): Promise<number> {
    const lastMonthEnd = new Date();
    lastMonthEnd.setMonth(lastMonthEnd.getMonth() - 1);
    lastMonthEnd.setHours(23, 59, 59, 999);
    return await this.userChallengeResultsRepo.count({
      where: {
        created_at: LessThanOrEqual(lastMonthEnd),
      },
    });
  }

  async countTotalAttemptsByDifficulty(): Promise<{
    easy: number;
    medium: number;
    hard: number;
  }> {
    const res = await this.challengesRepo
      .createQueryBuilder('challenge')
      .select('challenge.difficulty', 'difficulty')
      .addSelect('SUM(challenge.total_attempts)', 'totalAttempts')
      .groupBy('challenge.difficulty')
      .getRawMany();

    const easy = parseInt(
      res.find((item) => item.difficulty === DifficultyEnum.EASY)
        ?.totalAttempts || '0',
    );
    const medium = parseInt(
      res.find((item) => item.difficulty === DifficultyEnum.MEDIUM)
        ?.totalAttempts || '0',
    );
    const hard = parseInt(
      res.find((item) => item.difficulty === DifficultyEnum.HARD)
        ?.totalAttempts || '0',
    );
    return { easy, medium, hard };
  }

  async getResultsStatisticsLastSixMonths() {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 5);
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);

    const statistic = await this.challengesRepo
      .createQueryBuilder('c')
      .leftJoin('c.user_challenge_results', 'ucr')
      .select(
        "TRIM(TO_CHAR(DATE_TRUNC('month', ucr.created_at), 'Month'))",
        'month',
      )
      .addSelect('COUNT(CASE WHEN ucr.status_id = 3 THEN 1 END)', 'accept')
      .addSelect('COUNT(ucr.id)', 'total')
      .where('ucr.created_at >= :startDate', { startDate })
      .groupBy('month')
      .orderBy('month', 'DESC')
      .getRawMany();

    // Generate array of last six months
    const lastSixMonths = Array.from({ length: 6 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      return d.toLocaleString('default', { month: 'long' });
    }).reverse();

    // Merge statistic with last six months
    const result = lastSixMonths.map((month) => {
      const data = statistic.find((s) => s.month.trim() === month);
      return {
        month,
        accept: data ? parseInt(data.accept) : 0,
        total: data ? parseInt(data.total) : 0,
      };
    });
    return result;
  }

  async getAllUserChallengeResultWithAChallenge(
    userId: number,
    challengeSlug: string,
  ) {
    const challenge = await this.challengesRepo.findOne({
      where: {
        slug: challengeSlug,
      },
    });
    if (!challenge) {
      throw new BadRequestException('Challenge not found');
    }
    const userChallengeResult = await this.userChallengeResultsRepo
      .createQueryBuilder('ucr')
      .leftJoinAndSelect('ucr.error_testcase', 'et')
      .where('ucr.user_id = :userId', { userId })
      .andWhere('ucr.status IN (:...statuses)', {
        statuses: [
          ChallengeResultStatusEnum.DONE,
          ChallengeResultStatusEnum.FAILED,
        ],
      })
      .andWhere('ucr.challenge_id = :challengeId', {
        challengeId: challenge.id,
      })
      .select([
        'ucr.id',
        'ucr.status_id',
        'ucr.code',
        'ucr.created_at',
        'ucr.language_id',
        'ucr.time',
        'ucr.memory',
        'ucr.compile_output',
        'ucr.stderr',
        'ucr.stdout',
        'ucr.message',
        'et.id',
        'et.input',
        'et.expected_output',
        'ucr.status',
      ])
      .getMany();
    return userChallengeResult;
  }
}
