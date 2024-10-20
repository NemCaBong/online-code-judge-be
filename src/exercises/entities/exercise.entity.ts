import { ClassExercise } from 'src/classes/entities/class-exercise.entity';
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { UserExerciseResult } from './user-exercise-result.entity';
import { ExerciseDetail } from './exercise-detail.entity';

@Entity('exercises')
export class Exercise {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('text')
  description: string;

  @Column({ type: 'boolean', default: false })
  is_deleted: boolean;

  @Column({ length: 300 })
  slug: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updated_at: Date;

  @Column({ length: 255 })
  name: string;

  @OneToMany(() => ClassExercise, (classExercise) => classExercise.exercise)
  classes_exercises: ClassExercise[];

  @OneToMany(
    () => UserExerciseResult,
    (UserExerciseResult) => UserExerciseResult.exercise,
    {
      createForeignKeyConstraints: false,
    },
  )
  user_exercise_results: UserExerciseResult[];

  @OneToMany(
    () => ExerciseDetail,
    (exerciseDetail) => exerciseDetail.exercise,
    { createForeignKeyConstraints: false },
  )
  exerciseDetails: ExerciseDetail[];
}
