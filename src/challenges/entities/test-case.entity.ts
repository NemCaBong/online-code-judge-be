import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Challenge } from './challenge.entity';

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

  @ManyToOne(() => Challenge, (challenge) => challenge.testCases, {
    createForeignKeyConstraints: false,
  })
  @JoinColumn({ name: 'challenge_id' })
  challenge: Challenge;
}
