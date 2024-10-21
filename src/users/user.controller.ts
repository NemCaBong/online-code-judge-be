import {
  Controller,
  Get,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { UserService } from './user.service';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('/students-list')
  async getAllStudents() {
    return await this.userService.getAllStudents();
  }

  @Post('/create-from-xlsx')
  @UseInterceptors(FileInterceptor('file'))
  async createUsersFromXlsx(@UploadedFile() file: Express.Multer.File) {
    await this.userService.createUsersFromXlsx(file);
    return { message: 'Success', statusCode: 201 };
  }

  @Get('info/total-and-last-month')
  async countTotalUsersAndLastMonth() {
    const [total, lastMonth] = await Promise.all([
      this.userService.countTotalStudents(),
      this.userService.countStudentsUntilLastMonth(),
    ]);
    return {
      message: 'Success',
      statusCode: 200,
      total,
      last_month_total: lastMonth,
    };
  }

  @Get('teachers-list')
  async getAllTeachers() {
    return {
      message: 'Success',
      statusCode: 200,
      teachers: await this.userService.getAllTeachers(),
    };
  }
}
