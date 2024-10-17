import {
  Column,
  Entity,
  ManyToMany,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Challenge } from '../../challenges/entities/challenge.entity';

@Entity('tags')
export class Tag {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 200 })
  name: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ default: false })
  is_deleted: boolean;

  @ManyToMany(() => Challenge, (challenge) => challenge.tags, {
    createForeignKeyConstraints: false,
  })
  challenges: Challenge[];
}
