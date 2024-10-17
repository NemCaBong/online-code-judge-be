import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Challenge } from './challenge.entity';

@Entity('hints')
export class Hint {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'integer' })
  challenge_id: number;

  @Column({ type: 'varchar', length: 200 })
  question: string;

  @Column({ type: 'varchar', length: 400 })
  answer: string;

  @ManyToOne(() => Challenge, (challenge) => challenge.hints, {
    createForeignKeyConstraints: false,
  })
  @JoinColumn({ name: 'challenge_id' })
  challenge: Challenge;

  @Column({ type: 'boolean', default: false })
  is_deleted: boolean;
}
