import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TodoChallenge } from './entities/todo-challenge.entity';
import { TodoChallengeService } from './todo-challenge.service';
import { TodoChallengeController } from './todo-challenge.controller';

@Module({
  imports: [TypeOrmModule.forFeature([TodoChallenge])],
  controllers: [TodoChallengeController],
  providers: [TodoChallengeService],
  exports: [TodoChallengeService],
})
export class TodoChallengeModule {}
