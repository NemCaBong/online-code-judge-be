import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ClassService } from './class.service';
import { CreateClassDto } from './dtos/create-class.dto';

@Controller('classes')
export class ClassController {
  constructor(private readonly classService: ClassService) {}

  @Get('done-and-total/:id')
  async getDoneAndTotalClasses(
    @Param('id') userId: number,
  ): Promise<{ doneClasses: number; totalClasses: number }> {
    const [doneClasses, totalClasses] = await Promise.all([
      this.classService.getNumberOfDoneClassesOfUser(userId),
      this.classService.getTotalClassesOfUser(userId),
    ]);
    return {
      doneClasses,
      totalClasses,
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
}
