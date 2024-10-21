import { User } from 'src/users/user.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Challenge } from './challenge.entity';

@Entity('user_challenge_results')
export class UserChallengeResult {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'uuid', nullable: true })
  submission_id: string;

  @ManyToOne(() => User, (user) => user.user_challenge_results, {
    createForeignKeyConstraints: false,
  })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Challenge, (challenge) => challenge.user_challenge_results, {
    createForeignKeyConstraints: false,
  })
  @JoinColumn({ name: 'challenge_id' })
  challenge: Challenge;

  @Column({ length: 30 })
  status: string;

  @CreateDateColumn()
  created_at: Date;

  @Column({ type: 'text', nullable: true })
  code: string;

  @Column({ type: 'integer', nullable: true })
  language_id: number;

  @Column({ type: 'numeric', precision: 10, scale: 2, nullable: true })
  time: number;

  @Column({ type: 'integer', nullable: true })
  memory: number;

  @Column({
    type: 'timestamp',
    nullable: true,
  })
  submitted_at: Date;

  @Column({ type: 'integer', nullable: true })
  status_id: number;
}
