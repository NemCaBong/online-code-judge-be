import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('challenges_tags')
export class ChallengeTag {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  challenge_id: number;

  @Column()
  tag_id: number;
}
