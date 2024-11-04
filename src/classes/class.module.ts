import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Class } from './entities/class.entity';
import { UserClass } from './entities/user-class.entity';
import { ClassService } from './class.service';
import { ClassController } from './class.controller';
import { PostEntity } from '../post/entities/post.entity';
import { ExerciseModule } from 'src/exercises/exercise.module';
import { UserExerciseDetail } from 'src/exercises/entities/user-exercise-detail';

@Module({
  imports: [
    forwardRef(() => ExerciseModule),
    TypeOrmModule.forFeature([
      Class,
      UserClass,
      PostEntity,
      UserExerciseDetail,
    ]),
  ],
  providers: [ClassService],
  exports: [ClassService],
  controllers: [ClassController],
})
export class ClassModule {}
