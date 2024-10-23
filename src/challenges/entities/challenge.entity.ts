import {
  Column,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { DifficultyEnum } from '../../common/enums/difficulty.enum';
import { UserChallengeResult } from './user-challenge-result.entity';
import { ChallengeDetail } from './challenge-detail.entity';
import { Tag } from '../../tags/entities/tag.entity';
import { TestCase } from './test-case.entity';
import { Hint } from './hint.entity';
import { TodoChallenge } from './todo-challenge.entity';

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
    enum: DifficultyEnum,
    default: DifficultyEnum.EASY,
  })
  difficulty: DifficultyEnum;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
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
  user_challenge_results: UserChallengeResult[];

  @OneToMany(
    () => ChallengeDetail,
    (challengeDetail) => challengeDetail.challenge,
    { createForeignKeyConstraints: false },
  )
  challenge_details: ChallengeDetail[];

  @ManyToMany(() => Tag, (tag) => tag.challenges, {
    createForeignKeyConstraints: false,
  })
  @JoinTable({
    name: 'challenges_tags', // Name of the join table
    joinColumn: { name: 'challenge_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'tag_id', referencedColumnName: 'id' },
  })
  tags: Tag[];

  @OneToMany(() => TestCase, (testCase) => testCase.challenge, {
    createForeignKeyConstraints: false,
  })
  test_cases: TestCase[];

  @OneToMany(() => Hint, (hint) => hint.challenge, {
    createForeignKeyConstraints: false,
  })
  hints: Hint[];

  @OneToMany(() => TodoChallenge, (todoChallenge) => todoChallenge.challenge, {
    createForeignKeyConstraints: false,
  })
  todos: TodoChallenge[];
}
