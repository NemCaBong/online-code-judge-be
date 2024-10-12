import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { User } from './user.entity';
import { UserChallengeResult } from 'src/challenges/entities/user-challenge-result.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, UserChallengeResult])],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
