import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { ExerciseService } from './exercise.service';
import { CreateExerciseDto } from './dtos/create-exercise.dto';
import { CurrentUser } from 'src/decorators/current-user.decorator';
import { User } from 'src/users/user.entity';
import { UserRole } from 'src/common/enums/user-role.enum';
import { RunExerciseDto } from './dtos/run-exercise.dto';
import { EvaluateExerciseDto } from './dtos/evaluate-exercise.dto';
import { Response } from 'express';

@Controller('exercises')
export class ExerciseController {
  constructor(private readonly exerciseService: ExerciseService) {}

  @Get('/info/done-and-total')
  async getDoneAndTotalUserExercises(@CurrentUser() user: User) {
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
  async createExercise(
    @Body() createExerciseDto: CreateExerciseDto,
    @CurrentUser() user: User,
  ) {
    if (user.role !== UserRole.TEACHER) {
      throw new BadRequestException('Only teacher can create exercise');
    }

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

  @Get('info/total-and-last-month')
  async countTotalAndUntilLastMonth() {
    const [total, lastMonth] = await Promise.all([
      this.exerciseService.countExercisesInSystem(),
      this.exerciseService.countExercisesUntilLastMonth(),
    ]);
    return {
      message: 'Success',
      statusCode: 200,
      total,
      last_month_total: lastMonth,
    };
  }

  @Get('users/classes/:classSlug/avg-score')
  async getUserClassScores(
    @CurrentUser() user: User,
    @Param('classSlug') classSlug: string,
  ) {
    return {
      message: 'Success',
      statusCode: 200,
      avg_score: await this.exerciseService.getScoreOfUserInAClass(
        user.id,
        classSlug,
      ),
    };
  }

  @Get('users/classes/:classSlug/graded')
  async getGradedExercises(
    @CurrentUser() user: User,
    @Param('classSlug') classSlug: string,
  ) {
    const graded_exercises = await this.exerciseService.getGradedExercises(
      user.id,
      classSlug,
    );
    return {
      message: 'Success',
      statusCode: 200,
      graded_exercises,
    };
  }

  @Get('users/classes/:classSlug/assigned')
  async getAssignedExercises(
    @CurrentUser() user: User,
    @Param('classSlug') classSlug: string,
  ) {
    const assigned_exercises = await this.exerciseService.getAssignedExercises(
      user.id,
      classSlug,
    );

    return {
      message: 'Success',
      statusCode: 200,
      assigned_exercises,
    };
  }

  @Post(':exerciseId/run')
  async runCode(
    @Param('exerciseId', ParseIntPipe) exerciseId: number,
    @Body() runCodeDto: RunExerciseDto,
    @CurrentUser() user: User,
  ) {
    const result = await this.exerciseService.runExercise(
      exerciseId,
      runCodeDto,
      user.id,
    );
    return {
      message: 'Success',
      statusCode: 200,
      result,
    };
  }

  @Post(':exerciseId/classes/:classSlug/submit')
  async submitExcersise(
    @Param('exerciseId', ParseIntPipe) exerciseId: number,
    @Param('classSlug') classSlug: string,
    @Body() submitExerciseDto: RunExerciseDto,
    @CurrentUser() user: User,
  ) {
    await this.exerciseService.submitExercise(
      exerciseId,
      submitExerciseDto,
      user.id,
      classSlug,
    );
    return {
      message: 'Success',
      statusCode: 201,
    };
  }

  @Get('classes/:classSlug/get-all')
  async getAllExercisesInClass(
    @Param('classSlug') classSlug: string,
    @CurrentUser() user: User,
  ) {
    const exercises =
      await this.exerciseService.getAllExercisesOfAClass(classSlug);

    return {
      message: 'Success',
      statusCode: 200,
      exercises,
    };
  }

  @Get(':exerciseId/classes/:classSlug/user-exercise-results')
  async getUserExerciseResult(
    @Param('exerciseId', ParseIntPipe) exerciseId: number,
    @Param('classSlug') classSlug: string,
  ) {
    const { user_exercise_results, aClass } =
      await this.exerciseService.getAllUserExerciseResOfAExerciseAndClass(
        exerciseId,
        classSlug,
      );

    return {
      message: 'Success',
      statusCode: 200,
      user_exercise_results,
      class: aClass,
    };
  }

  @Post(
    ':exerciseId/classes/:classSlug/user-exercise-results/:userExerciseResultId/evaluate',
  )
  async evaluateExercise(
    @Param('exerciseId', ParseIntPipe) exerciseId: number,
    @Param('classSlug') classSlug: string,
    @Body() evaluateExerciseDto: EvaluateExerciseDto,
    @CurrentUser() user: User,
    @Param('userExerciseResultId', ParseIntPipe) userExerciseResultId: number,
  ) {
    const exercise = await this.exerciseService.evaluateExercise({
      exerciseId,
      classSlug,
      evaluateExerciseDto,
      userId: user.id,
      userExerciseResultId,
    });

    return {
      message: 'Success',
      statusCode: 200,
      exercise,
    };
  }

  @Get('export-to-zip')
  async exportExercisesToZip(
    @Query('exerciseId', ParseIntPipe) exerciseId: number,
    @Res() res: Response,
  ) {
    const zip = await this.exerciseService.exportExerciseDetails(exerciseId);
    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename=exercise-${exerciseId}-details.zip`,
      'Content-Length': zip.length,
    });
    res.end(zip);
  }

  @Get(':exerciseId')
  async getExerciseById(@Param('exerciseId', ParseIntPipe) exerciseId: number) {
    const exercise = await this.exerciseService.getExerciseById(exerciseId);
    return {
      message: 'Success',
      statusCode: 200,
      exercise,
    };
  }
}
