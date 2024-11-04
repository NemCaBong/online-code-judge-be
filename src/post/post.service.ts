import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PostEntity } from './entities/post.entity';
import { Repository } from 'typeorm';
import { ClassService } from 'src/classes/class.service';

@Injectable()
export class PostService {
  constructor(
    @InjectRepository(PostEntity)
    private readonly postRepo: Repository<PostEntity>,
    private readonly classService: ClassService,
  ) {}

  async createPost(
    createPostDto: { content: string },
    classSlug: string,
  ): Promise<PostEntity> {
    const thatClass = await this.classService.getAClass(classSlug);
    if (!thatClass) {
      throw new NotFoundException('Class not found');
    }
    const post = new PostEntity();
    post.content = createPostDto.content;
    post.class_id = thatClass.id;
    return this.postRepo.save(post);
  }
}
