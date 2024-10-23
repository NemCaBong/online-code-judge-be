import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Exercise } from './entities/exercise.entity';
import { ExerciseService } from './exercise.service';
import { UserClass } from 'src/classes/entities/user-class.entity';
import { UserExerciseResult } from './entities/user-exercise-result.entity';
import { ClassModule } from '../classes/class.module';
import { ExerciseController } from './exercise.controller';
import { ExerciseDetail } from './entities/exercise-detail.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Exercise,
      UserClass,
      UserExerciseResult,
      ExerciseDetail,
    ]),
    ClassModule,
  ],
  providers: [ExerciseService],
  exports: [ExerciseService],
  controllers: [ExerciseController],
})
export class ExerciseModule {}
