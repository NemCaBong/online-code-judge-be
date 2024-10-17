import { Module } from '@nestjs/common';
import { ChallengesController } from './challenges.controller';
import { ChallengesService } from './challenges.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Challenge } from './entities/challenge.entity';
import { UserChallengeResult } from './entities/user-challenge-result.entity';
import { User } from 'src/users/user.entity';
import { ChallengeDetail } from './entities/challenge-detail.entity';
import { Tag } from '../tags/entities/tag.entity';
import { TestCase } from './entities/test-case.entity';
import { Hint } from './entities/hint.entity';
import { ChallengeTag } from './entities/challenge-tag.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Challenge,
      UserChallengeResult,
      User,
      ChallengeDetail,
      Tag,
      TestCase,
      Hint,
      ChallengeTag,
    ]),
  ],
  providers: [ChallengesService],
  controllers: [ChallengesController],
})
export class ChallengeModule {}
