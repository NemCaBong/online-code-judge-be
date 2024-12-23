import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToOne,
} from 'typeorm';
import { Challenge } from './challenge.entity';
import { UserChallengeResult } from './user-challenge-result.entity';

@Entity('test_cases')
export class TestCase {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('text')
  input: string;

  @Column('text')
  expected_output: string;

  @Column('integer')
  challenge_id: number;

  @Column({ type: 'boolean', default: false })
  is_sampled: boolean;

  @ManyToOne(() => Challenge, (challenge) => challenge.test_cases, {
    createForeignKeyConstraints: false,
  })
  @JoinColumn({ name: 'challenge_id' })
  challenge: Challenge;

  @OneToOne(
    () => UserChallengeResult,
    (userChallengeResult) => userChallengeResult.error_testcase,
    { createForeignKeyConstraints: false },
  )
  user_challenge_result: UserChallengeResult;
}
