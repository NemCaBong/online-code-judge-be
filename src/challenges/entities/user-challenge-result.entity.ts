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

  @Column({ type: 'integer', nullable: true })
  challenge_id: number;

  @Column({ type: 'integer', nullable: true })
  user_id: number;

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
  status_id: number;

  @Column({ nullable: true, length: 100 })
  message: string;

  @Column({ type: 'integer', nullable: true })
  memory: number;

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
}
