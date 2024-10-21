import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ClassService } from './class.service';
import { CreateClassDto } from './dtos/create-class.dto';
import { CurrentUser } from 'src/decorators/current-user.decorator';
import { User } from 'src/users/user.entity';

@Controller('classes')
export class ClassController {
  constructor(private readonly classService: ClassService) {}

  @Get()
  async getAllClassesOfUser(@CurrentUser() user: User) {
    console.log(user);
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
}
