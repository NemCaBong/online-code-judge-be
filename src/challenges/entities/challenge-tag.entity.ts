import { Column, Entity, PrimaryColumn, PrimaryGeneratedColumn } from 'typeorm';

@Entity('challenges_tags')
export class ChallengeTag {
  @PrimaryColumn()
  challenge_id: number;

  @PrimaryColumn()
  tag_id: number;
}
