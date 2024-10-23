import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserService } from './user.service';
import { User } from './user.entity';
import { UserChallengeResult } from 'src/challenges/entities/user-challenge-result.entity';
import { UserClass } from 'src/classes/entities/user-class.entity';
import { UserController } from './user.controller';
import { TodoChallenge } from 'src/challenges/entities/todo-challenge.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      UserChallengeResult,
      UserClass,
      TodoChallenge,
    ]),
  ],
  providers: [UserService],
  exports: [UserService],
  controllers: [UserController],
})
export class UserModule {}
