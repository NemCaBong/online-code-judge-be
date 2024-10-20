import { Controller, Get } from '@nestjs/common';
import { TagService } from './tag.service';

@Controller('tags')
export class TagController {
  constructor(private readonly tagService: TagService) {}

  @Get('list')
  async getAllTags() {
    return {
      message: 'Success',
      status_code: 200,
      tags: await this.tagService.getAllTags(),
    };
  }
}
