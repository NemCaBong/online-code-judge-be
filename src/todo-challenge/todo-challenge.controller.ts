import { Controller, Post, UseGuards, Query } from '@nestjs/common';
import { TodoChallengeService } from './todo-challenge.service';
// import { CreateTodoChallengeDto } from './dto/create-todo-challenge.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AddTodoDto } from './dtos/add-todo.dto';
import { CurrentUser } from 'src/decorators/current-user.decorator';
import { User } from 'src/users/user.entity';

@Controller('todo')
@UseGuards(JwtAuthGuard)
export class TodoChallengeController {
  constructor(private readonly todoChallengeService: TodoChallengeService) {}

  @Post('add')
  async addToTodo(@CurrentUser() user: User, @Query() addTodo: AddTodoDto) {
    const res = await this.todoChallengeService.addTodo(
      user.id,
      addTodo.challengeId,
    );

    return {
      message: 'Success',
      statusCode: 201,
    };
  }
}
