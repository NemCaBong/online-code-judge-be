import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ExerciseService } from './exercise.service';
import { CreateExerciseDto } from './dtos/create-exercise.dto';

@Controller('exercises')
export class ExerciseController {
  constructor(private readonly exerciseService: ExerciseService) {}

  @Get('done-and-total/:id')
  async getDoneAndTotalExercises(
    @Param('id') userId: number,
  ): Promise<{ doneExercises: number; totalExercises: number }> {
    const [doneExercises, totalExercises] = await Promise.all([
      this.exerciseService.getNumberOfDoneExercises(userId),
      this.exerciseService.getTotalExercises(userId),
    ]);
    return {
      doneExercises,
      totalExercises,
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
}
