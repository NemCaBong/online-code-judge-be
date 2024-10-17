import {
  Controller,
  Get,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { UserService } from './users.service';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('/students-list')
  async getAllUsers() {
    return await this.userService.getAllStudents();
  }

  @Post('/create-from-xlsx')
  @UseInterceptors(FileInterceptor('file'))
  async createUsersFromXlsx(@UploadedFile() file: Express.Multer.File) {
    await this.userService.createUsersFromXlsx(file);
    return { message: 'Success', statusCode: 201 };
  }
}
