import { Body, Controller, Post, Query } from '@nestjs/common';
import { PostService } from './post.service';
import { PostEntity } from './entities/post.entity';

@Controller('posts')
export class PostController {
  constructor(private readonly postService: PostService) {}

  @Post('create')
  async createPost(
    @Body() createPostDto: { content: string },
    @Query('classSlug') classSlug: string,
  ) {
    await this.postService.createPost(createPostDto, classSlug);
    return {
      message: 'Success',
      statusCode: 201,
    };
  }
}
