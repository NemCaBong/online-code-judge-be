import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PostEntity } from './entities/post.entity';
import { PostService } from './post.service';
import { PostController } from './post.controller';
import { ClassModule } from 'src/classes/class.module';

@Module({
  imports: [TypeOrmModule.forFeature([PostEntity]), ClassModule],
  providers: [PostService],
  controllers: [PostController],
})
export class PostModule {}
