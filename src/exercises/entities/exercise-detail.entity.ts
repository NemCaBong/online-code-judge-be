import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Exercise } from './exercise.entity';

@Entity('exercise_details')
export class ExerciseDetail {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 30 })
  file_name: string;

  @Column('text')
  boilerplate_code: string;

  @Column()
  @Column()
  language_id: number;

  @Column({ type: 'integer' })
  exercise_id: number;

  @ManyToOne(() => Exercise, (exercise) => exercise.exercise_details, {
    createForeignKeyConstraints: false,
  })
  @JoinColumn({ name: 'exercise_id' })
  exercise: Exercise;
}
