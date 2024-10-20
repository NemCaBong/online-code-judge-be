import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ExerciseService } from './exercise.service';
import { CreateExerciseDto } from './dtos/create-exercise.dto';
import { CurrentUser } from 'src/decorators/current-user.decorator';
import { User } from 'src/users/user.entity';

@Controller('exercises')
export class ExerciseController {
  constructor(private readonly exerciseService: ExerciseService) {}

  @Get('/info/done-and-total')
  async getDoneAndTotalExercises(@CurrentUser() user: User) {
    const [done, total] = await Promise.all([
      this.exerciseService.getNumberOfDoneExercises(user.id),
      this.exerciseService.getTotalExercises(user.id),
    ]);
    return {
      message: 'Success',
      statusCode: 200,
      done,
      total,
    };
  }

  @Post('create')
  async createExercise(@Body() createExerciseDto: CreateExerciseDto) {
    await this.exerciseService.createExercise(createExerciseDto);
    return {
      message: 'Success',
      statusCode: 201,
    };
  }

  @Get('/users/soon-due')
  async getSoonDueExercises(@CurrentUser() user: User) {
    const soon_due_exercises =
      await this.exerciseService.getUserSoonDueExercises(user.id);
    return {
      message: 'Success',
      statusCode: 200,
      soon_due_exercises,
    };
  }
}
