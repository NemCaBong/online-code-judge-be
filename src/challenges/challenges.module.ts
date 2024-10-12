import { Module } from '@nestjs/common';
import { ChallengesController } from './challenges.controller';
import { ChallengesService } from './challenges.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Challenge } from './entities/challenge.entity';
import { UserChallengeResult } from './entities/user-challenge-result.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Challenge, UserChallengeResult])],
  providers: [ChallengesService],
  controllers: [ChallengesController],
})
export class ChallengeModule {}
