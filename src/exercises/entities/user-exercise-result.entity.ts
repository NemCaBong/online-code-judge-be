import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/user.entity';
import { Exercise } from './exercise.entity';
import { Class } from '../../classes/entities/class.entity';

@Entity('user_exercise_results')
export class UserExerciseResult {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 30 })
  status: string;

  @Column({ nullable: true })
  score: number;

  @Column({ length: 1000, nullable: true })
  evaluation: string;

  @Column()
  user_id: number;

  @Column()
  exercise_id: number;

  @Column()
  class_id: number;

  @ManyToOne(() => User, { createForeignKeyConstraints: false })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Exercise, { createForeignKeyConstraints: false })
  @JoinColumn({ name: 'exercise_id' })
  exercise: Exercise;

  @ManyToOne(() => Class, { createForeignKeyConstraints: false })
  @JoinColumn({ name: 'class_id' })
  class: Class;

  @Column({
    type: 'timestamp',
    nullable: true,
  })
  submitted_at: Date;
}
