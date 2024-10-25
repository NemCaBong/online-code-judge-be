import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { UserExerciseResult } from './user-exercise-result.entity';

@Entity('user_exercise_details')
export class UserExerciseDetail {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('text', { nullable: true })
  code: string;

  @Column('integer', { nullable: true })
  language_id: number;

  @Column('integer', { nullable: true })
  user_exercise_id: number;

  @Column('varchar', { length: 100, nullable: true })
  file_name: string;

  @ManyToOne(
    () => UserExerciseResult,
    (userExercise) => userExercise.user_exercise_details,
    { createForeignKeyConstraints: false },
  )
  @JoinColumn({ name: 'user_exercise_id' })
  user_exercise_result: UserExerciseResult;
}
