import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Class } from './class.entity';
import { Exercise } from '../../exercises/entities/exercise.entity';

@Entity('classes_exercises')
export class ClassExercise {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  class_id: number;

  @Column()
  exercise_id: number;

  @ManyToOne(() => Class, { createForeignKeyConstraints: false })
  @JoinColumn({ name: 'class_id' })
  class: Class;

  @ManyToOne(() => Exercise, { createForeignKeyConstraints: false })
  @JoinColumn({ name: 'exercise_id' })
  exercise: Exercise;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  due_at: Date;
}
