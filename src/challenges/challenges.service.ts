import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Challenge } from './entities/challenge.entity';
import { DataSource, In, Repository } from 'typeorm';
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
import { Judge0StatusDescription } from 'src/common/constants';

@Injectable()
export class ChallengesService {
  constructor(
    @InjectRepository(Challenge)
    private readonly challengesRepository: Repository<Challenge>,
    @InjectRepository(UserChallengeResult)
    private readonly userChallengeResultsRepository: Repository<UserChallengeResult>,
    @InjectRepository(TestCase)
    private readonly testCaseRepo: Repository<TestCase>,
    private readonly dataSource: DataSource,
  ) {}

  async getAllChallenges(page: number = 1, limit: number = 10) {
    const queryBuilder =
      this.challengesRepository.createQueryBuilder('challenge');

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

  async getAllChallengesWithUserStatus(
    userId: number,
    page: number = 1,
    limit: number = 10,
  ) {
    const queryBuilder = this.challengesRepository
      .createQueryBuilder('challenge')
      .leftJoinAndSelect(
        'challenge.userChallengeResults',
        'userChallengeResult',
        'userChallengeResult.user_id = :userId',
        { userId },
      )
      .select([
        'challenge.id',
        'challenge.name',
        'challenge.description',
        'challenge.difficulty',
        'challenge.slug',
        // 'userChallengeResult.submission_id',
        'challenge.created_at',
      ])
      .where('challenge.is_deleted = :isDeleted', { isDeleted: false })
      .orderBy('challenge.created_at', 'DESC')
      .take(limit)
      .skip((page - 1) * limit);

    const [challenges, total] = await queryBuilder.getManyAndCount();

    const formattedChallenges = challenges.map((challenge) => ({
      ...challenge,
      status: challenge.userChallengeResults?.[0]?.code
        ? 'done'
        : challenge.userChallengeResults?.[0]
          ? 'to-do'
          : 'not-done',
    }));

    return {
      data: formattedChallenges,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async countAllChallengesAndUsersSubmitted(userId: number) {
    const [challengesByDifficulty, usersSubmittedByDifficulty] =
      await Promise.all([
        this.challengesRepository
          .createQueryBuilder('challenge')
          .select('challenge.difficulty, COUNT(challenge.id)', 'total')
          .groupBy('challenge.difficulty')
          .getRawMany(),
        this.userChallengeResultsRepository
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
    const queryBuilder = this.userChallengeResultsRepository
      .createQueryBuilder('ucr')
      .innerJoinAndSelect('ucr.challenge', 'c')
      .select([
        'ucr.id',
        'c.id as challenge_id',
        'c.name',
        'c.slug',
        'ucr.created_at',
      ])
      .where('ucr.user_id = :userId', { userId })
      .andWhere('ucr.code IS NULL')
      .orderBy('ucr.created_at', 'DESC')
      .take(10);

    const todos = await queryBuilder.getMany();
    console.log(todos);
    return todos;
  }

  async getDoneChallenges(userId: number): Promise<number> {
    return await this.userChallengeResultsRepository
      .createQueryBuilder('ucr')
      .innerJoinAndSelect('ucr.challenge', 'c')
      .select([
        'ucr.id',
        'c.id as challenge_id',
        'c.name',
        'c.slug',
        'ucr.created_at',
      ])
      .where('ucr.user_id = :userId', { userId })
      .andWhere('ucr.code IS NOT NULL')
      .getCount();
  }

  async getTotalChallenges(): Promise<number> {
    return await this.challengesRepository.createQueryBuilder('c').getCount();
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
      await Promise.all([
        queryRunner.manager.save(hints),
        queryRunner.manager.save(tags),
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
    const queryBuilder =
      this.challengesRepository.createQueryBuilder('challenge');

    const challenge = await queryBuilder
      .leftJoinAndSelect('challenge.hints', 'hints', 'hints.is_deleted = false')
      .leftJoinAndSelect('challenge.tags', 'tags', 'tags.is_deleted = false')
      .leftJoinAndSelect(
        'challenge.testCases',
        'testCases',
        'testCases.is_sampled = true',
      )
      .leftJoinAndSelect('challenge.challengeDetails', 'challengeDetails')
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
        'testCases.id',
        'testCases.input',
        'testCases.expected_output',
        'challengeDetails.id',
        'challengeDetails.language_id',
        'challengeDetails.boilerplate_code',
      ])
      .getOne();

    if (challenge && challenge.testCases) {
      // Sort test cases by their id
      challenge.testCases.sort((a, b) => a.id - b.id);
    }

    return challenge;
  }

  async runChallengeTests(
    challenge_slug: string,
    runChallengeDto: RunChallengeDto,
  ) {
    const challenge = await this.challengesRepository
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

    console.log(submissions);

    try {
      const response = await axios.post(
        'http://localhost:2358/submissions/batch?base64_encoded=true',
        {
          submissions,
        },
        {
          headers: {
            'X-Auth-Token': 't2UFBewPFQcqnMwPaPmmBChpy7P9T6tT',
          },
        },
      );

      // Combine tokens with test case IDs
      const result = response.data.map((item, index) => ({
        token: item.token,
        testCaseId: testCases[index].id,
      }));

      return { message: 'Success', data: result };
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
        `http://localhost:2358/submissions/batch?tokens=${tokens}&base64_encoded=true`,
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
          return {
            message: 'Error',
            error: Judge0StatusDescription[statusId],
            statusCode: 400,
            submission,
            errorTestCase: testCase,
          };
        }
      }

      const wrongAnswer = submissions.find(
        (submission) => submission.status?.id === Judge0Status.WRONG_ANSWER,
      );
      if (wrongAnswer) {
        return {
          message: 'Error',
          error: Judge0StatusDescription[Judge0Status.WRONG_ANSWER],
          statusCode: 400,
          submissions,
        };
      }

      // Process and return the results if all are ready
      const results = submissions.map((submission) => {
        const pollData = runPollDto.runPoll.find(
          (item) => item.token === submission.token,
        );
        const { stdout, stderr, ...submissionData } = submission;
        return {
          stderr: stderr
            ? Buffer.from(stderr, 'base64').toString('utf-8')
            : null,
          stdout: stdout
            ? Buffer.from(stdout, 'base64').toString('utf-8')
            : null,
          ...submissionData,
        };
      });

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
  ) {
    const { code, languageId } = submitChallengeDto;

    // Fetch the challenge by slug
    const challenge = await this.challengesRepository
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
        'http://localhost:2358/submissions/batch?base64_encoded=true',
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
      return { message: 'Success', data: res };
    } catch (error) {
      throw new BadRequestException(
        `Error processing submissions: ${error.message}`,
      );
    }
  }

  async pollingForSubmission(
    challengeSlug: string,
    submitPollDto: SubmitPollDto,
  ) {
    // sort submitPollDto by testCaseId
    submitPollDto.submitPoll.sort((a, b) => a.testCaseId - b.testCaseId);
    const { submitPoll } = submitPollDto;
    const tokens = submitPoll.map((item) => item.token).join(',');
    const response = await axios.get(
      `http://localhost:2358/submissions/batch?tokens=${tokens}&base64_encoded=true`,
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
        const { stdout, stderr, message, ...submissionData } = submission;
        console.log(submissionData);
        throw new BadRequestException({
          message: 'Error',
          error: Judge0StatusDescription[id],
          statusCode: 400,
          submission: {
            stdout: stdout
              ? Buffer.from(stdout, 'base64').toString('utf-8')
              : null,
            stderr: stderr
              ? Buffer.from(stderr, 'base64').toString('utf-8')
              : null,
            message: message
              ? Buffer.from(message, 'base64').toString('utf-8')
              : null,
            ...submissionData,
          },
          errorTestCase: testCase,
        });
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

    return {
      message: 'Success',
      averageTime,
      averageMemory,
      statusCode: 200,
    };
  }
}
