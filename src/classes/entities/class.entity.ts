import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/user.entity';
import { ClassExercise } from './class-exercise.entity';
import { UserClass } from './user-class.entity';

@Entity('classes')
export class Class {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 255 })
  name: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updated_at: Date;

  @Column({ length: 300 })
  slug: string;

  @Column()
  total_students: number;

  @Column()
  teacher_id: number;

  @ManyToOne(() => User, { createForeignKeyConstraints: false })
  @JoinColumn({ name: 'teacher_id' })
  teacher: User;

  @OneToMany(() => ClassExercise, (classExercise) => classExercise.class)
  classes_exercises: ClassExercise[];

  @OneToMany(() => UserClass, (userClass) => userClass.class, {
    createForeignKeyConstraints: false,
  })
  students: User[];

  @OneToMany(() => UserClass, (userClass) => userClass.class, {
    createForeignKeyConstraints: false,
  })
  user_classes: UserClass[];

  @Column({ type: 'boolean', default: false })
  is_done: boolean;
}
