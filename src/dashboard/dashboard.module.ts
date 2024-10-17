import { Module } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { ExerciseModule } from 'src/exercises/exercise.module';
import { ExerciseService } from 'src/exercises/exercise.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserClass } from 'src/classes/entities/user-class.entity';
import { ClassExercise } from 'src/classes/entities/class-exercise.entity';
import { ClassModule } from 'src/classes/class.module';
import { Exercise } from '../exercises/entities/exercise.entity';
import { ExerciseDetail } from 'src/exercises/entities/exercise-detail.entity';

@Module({
  imports: [
    ExerciseModule,
    TypeOrmModule.forFeature([
      UserClass,
      ClassExercise,
      Exercise,
      ExerciseDetail,
    ]),
    ClassModule,
  ],
  providers: [DashboardService, ExerciseService],
  controllers: [DashboardController],
})
export class DashboardModule {}
