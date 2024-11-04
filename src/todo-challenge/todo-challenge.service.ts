import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AddTodoDto } from './dtos/add-todo.dto';
import { TodoChallenge } from './entities/todo-challenge.entity';

@Injectable()
export class TodoChallengeService {
  constructor(
    @InjectRepository(TodoChallenge)
    private todoChallengeRepository: Repository<TodoChallenge>,
  ) {}

  async addTodo(userId: number, challengeId: number) {
    const existingTodo = await this.todoChallengeRepository.findOne({
      where: {
        user_id: userId,
        challenge_id: challengeId,
        is_done: false,
      },
    });

    if (existingTodo) {
      throw new BadRequestException('Exercise already in todo list');
    }

    const todoChallenge = this.todoChallengeRepository.create({
      user_id: userId,
      challenge_id: challengeId,
      is_done: false,
    });

    return await this.todoChallengeRepository.save(todoChallenge);
  }

  async markedAsDoneIfExists(challengeId: number, userId: number) {
    const todoChallenge = await this.todoChallengeRepository.findOne({
      where: {
        challenge_id: challengeId,
        user_id: userId,
        is_done: false,
      },
    });

    if (!todoChallenge) {
      return;
    }
    return await this.todoChallengeRepository.update(todoChallenge.id, {
      is_done: true,
    });
  }
}
