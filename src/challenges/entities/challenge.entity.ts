import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Difficulty } from '../../common/enums/difficulty.enum';
import { UserChallengeResult } from './user-challenge-result.entity';

@Entity('challenges')
export class Challenge {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 255 })
  name: string;

  @Column('text')
  description: string;

  @Column({
    type: 'enum',
    enum: Difficulty,
    default: Difficulty.MEDIUM,
  })
  difficulty: Difficulty;

  @Column('date')
  created_at: Date;

  @Column('date')
  updated_at: Date;

  @Column({ default: false })
  is_deleted: boolean;

  @Column({ length: 300 })
  slug: string;

  @Column('integer', { default: 0 })
  accepted_results: number;

  @Column('integer', { default: 0 })
  total_attempts: number;

  @Column('integer', { default: 128 })
  space_limit: number;

  @Column('integer', { default: 1 })
  time_limit: number;

  @OneToMany(
    () => UserChallengeResult,
    (userChallengeResult) => userChallengeResult.challenge,
  )
  @JoinColumn()
  userChallengeResults: UserChallengeResult[];
}
