import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Challenge } from './entities/challenge.entity';
import { Repository } from 'typeorm';
import { UserChallengeResult } from './entities/user-challenge-result.entity';

@Injectable()
export class ChallengesService {
  constructor(
    @InjectRepository(Challenge)
    private readonly challengesRepository: Repository<Challenge>,
    @InjectRepository(UserChallengeResult)
    private readonly userChallengeResultsRepository: Repository<UserChallengeResult>,
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
        'userChallengeResult.submission_id',
        'challenge.created_at',
      ])
      .where('challenge.is_deleted = :isDeleted', { isDeleted: false })
      .orderBy('challenge.created_at', 'DESC')
      .take(limit)
      .skip((page - 1) * limit);

    const [challenges, total] = await queryBuilder.getManyAndCount();

    const formattedChallenges = challenges.map((challenge) => ({
      ...challenge,
      status: challenge.userChallengeResults?.[0]?.submission_id
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
    const challengesByDifficulty = await this.challengesRepository
      .createQueryBuilder('challenge')
      .select('challenge.difficulty, COUNT(challenge.id)', 'total')
      .groupBy('challenge.difficulty')
      .getRawMany();
    const usersSubmittedByDifficulty = await this.userChallengeResultsRepository
      .createQueryBuilder('ucr')
      .innerJoin(Challenge, 'challenge', 'challenge.id = ucr.challenge_id')
      .select('challenge.difficulty, COUNT(ucr.id)', 'total')
      .where('ucr.submission_id IS NOT NULL')
      .andWhere('ucr.user_id = :userId', { userId })
      .groupBy('challenge.difficulty')
      .getRawMany();

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
}
