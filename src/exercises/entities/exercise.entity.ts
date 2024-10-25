import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UserExerciseResult } from './user-exercise-result.entity';
import { ExerciseDetail } from './exercise-detail.entity';
import { Class } from 'src/classes/entities/class.entity';
import { User } from 'src/users/user.entity';

@Entity('exercises')
export class Exercise {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('text')
  description: string;

  @Column({ type: 'boolean', default: false })
  is_deleted: boolean;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updated_at: Date;

  @Column({ length: 255 })
  name: string;

  @Column({ type: 'timestamp', nullable: true })
  due_at: Date;

  @Column({ type: 'integer' })
  class_id: number;

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
  exercise_details: ExerciseDetail[];

  @ManyToOne(() => Class, { createForeignKeyConstraints: false })
  @JoinColumn({ name: 'class_id' })
  class: Class;
}
