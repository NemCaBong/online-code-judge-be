import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/user.entity';
import { UserClass } from './user-class.entity';
import { PostEntity } from '../../post/entities/post.entity';
import { Exercise } from 'src/exercises/entities/exercise.entity';

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

  @OneToMany(() => PostEntity, (post) => post.class, {
    createForeignKeyConstraints: false,
  })
  posts: PostEntity[];

  @OneToMany(() => Exercise, (exercise) => exercise.class, {
    createForeignKeyConstraints: false,
  })
  exercises: Exercise[];
}
