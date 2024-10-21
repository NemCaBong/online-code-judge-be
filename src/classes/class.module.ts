import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Class } from './entities/class.entity';
import { ClassExercise } from './entities/class-exercise.entity';
import { UserClass } from './entities/user-class.entity';
import { ClassService } from './class.service';
import { ClassController } from './class.controller';
import { PostEntity } from './entities/post.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Class, ClassExercise, UserClass, PostEntity]),
  ],
  providers: [ClassService],
  exports: [ClassService],
  controllers: [ClassController],
})
export class ClassModule {}
