import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ClassService } from './class.service';
import { CreateClassDto } from './dtos/create-class.dto';
import { CurrentUser } from 'src/decorators/current-user.decorator';
import { User } from 'src/users/user.entity';
import { ExerciseService } from 'src/exercises/exercise.service';

@Controller('classes')
export class ClassController {
  constructor(
    private readonly classService: ClassService,
    private readonly exerciseService: ExerciseService,
  ) {}

  @Get()
  async getAllClassesOfUser(@CurrentUser() user: User) {
    // console.log(user);
    const classes = await this.classService.getAllClassesOfUser(user.id);
    return {
      message: 'Success',
      statusCode: 200,
      classes,
    };
  }

  @Get('info/done-and-total')
  async getDoneAndTotalClasses(@CurrentUser() user: User) {
    const [done, total] = await Promise.all([
      this.classService.getNumberOfDoneClassesOfUser(user.id),
      this.classService.getTotalClassesOfUser(user.id),
    ]);
    return {
      message: 'Success',
      statusCode: 200,
      done,
      total,
    };
  }

  @Post('create')
  async createClass(@Body() createClassDto: CreateClassDto): Promise<object> {
    await this.classService.createClass(createClassDto);
    return {
      message: 'Success',
      statusCode: 201,
    };
  }

  @Get('users')
  async getClassUsers(
    @CurrentUser() user: User,
    @Query() query: { page: number },
  ) {
    const classes = await this.classService.getClassesOfUser(user.id);
    return {
      message: 'Success',
      statusCode: 200,
      classes,
    };
  }

  @Get('info/total-and-last-month')
  async getTotalClassesAndLastMonth() {
    const [total, lastMonth] = await Promise.all([
      this.classService.countClassesInSystem(),
      this.classService.countClassesUntilLastMonth(),
    ]);
    return {
      message: 'Success',
      statusCode: 200,
      total,
      last_month_total: lastMonth,
    };
  }

  @Get(':classSlug')
  async getAClass(@Param('classSlug') classSlug: string) {
    const lookingClass = await this.classService.getAClass(classSlug);
    return {
      message: 'Success',
      statusCode: 200,
      class: lookingClass,
    };
  }

  @Get('teachers/all')
  async getAllClassesOfTeacher(@CurrentUser() user: User) {
    const classes = await this.classService.getAllClassOfATeacher(user.id);
    return {
      message: 'Success',
      statusCode: 200,
      classes,
    };
  }

  @Get(':classSlug/exercises/:exerciseId')
  async getExerciseOfAClass(
    @Param('classSlug') classSlug: string,
    @Param('exerciseId', ParseIntPipe) exerciseId: number,
    @CurrentUser() user: User,
  ) {
    const exercise = await this.exerciseService.getAnExercise(
      classSlug,
      exerciseId,
      user.id,
    );

    return {
      message: 'Success',
      statusCode: 200,
      exercise,
    };
  }
}
