import { User } from 'src/users/user.entity';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Challenge } from './challenge.entity';

@Entity('user_challenge_results')
export class UserChallengeResult {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'uuid' })
  submission_id: string;

  @ManyToOne(() => User, (user) => user.userChallengeResults, {
    createForeignKeyConstraints: false,
  })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Challenge, (challenge) => challenge.userChallengeResults, {
    createForeignKeyConstraints: false,
  })
  @JoinColumn({ name: 'challenge_id' })
  challenge: Challenge;

  @Column({ length: 30 })
  status: string;
}
