import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Challenge } from './challenge.entity';

@Entity('challenge_details')
export class ChallengeDetail {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  language_id: number;

  @Column('text')
  boilerplate_code: string;

  @Column()
  challenge_id: number;

  @ManyToOne(() => Challenge, (challenge) => challenge.challenge_details, {
    createForeignKeyConstraints: false,
  })
  @JoinColumn({ name: 'challenge_id' })
  challenge: Challenge;
}
