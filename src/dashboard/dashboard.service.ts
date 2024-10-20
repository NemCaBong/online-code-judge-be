import { Injectable } from '@nestjs/common';
import { ExerciseService } from 'src/exercises/exercise.service';
import { ClassService } from '../classes/class.service';

@Injectable()
export class DashboardService {
  constructor(
    private readonly exerciseService: ExerciseService,
    private readonly classService: ClassService,
  ) {}

  async getDashboard() {
    const classes = await this.classService.getClassesOfUser(1);
    const soonDueExercises =
      await this.exerciseService.getUserSoonDueExercises(1);
    return {
      classes,
      soonDueExercises,
    };
  }
}
