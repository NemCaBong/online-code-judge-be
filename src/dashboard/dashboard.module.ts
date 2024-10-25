import { Module } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { ExerciseModule } from 'src/exercises/exercise.module';
import { ExerciseService } from 'src/exercises/exercise.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserClass } from 'src/classes/entities/user-class.entity';
import { ClassModule } from 'src/classes/class.module';
import { Exercise } from '../exercises/entities/exercise.entity';
import { ExerciseDetail } from 'src/exercises/entities/exercise-detail.entity';
import { UserExerciseResult } from 'src/exercises/entities/user-exercise-result.entity';
import { UserExerciseDetail } from 'src/exercises/entities/user-exercise-detail';

@Module({
  imports: [
    ExerciseModule,
    TypeOrmModule.forFeature([
      UserClass,
      Exercise,
      ExerciseDetail,
      UserExerciseResult,
      UserExerciseDetail,
    ]),
    ClassModule,
  ],
  providers: [DashboardService, ExerciseService],
  controllers: [DashboardController],
})
export class DashboardModule {}
