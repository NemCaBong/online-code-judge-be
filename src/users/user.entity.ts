import { UserChallengeResult } from 'src/challenges/entities/user-challenge-result.entity';
import { UserClass } from 'src/classes/entities/user-class.entity';
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 30 })
  first_name: string;

  @Column({ length: 30 })
  last_name: string;

  @Column({ length: 20 })
  role: string;

  @Column({ length: 255 })
  email: string;

  @Column({ length: 255 })
  password: string;

  @OneToMany(
    () => UserChallengeResult,
    (userChallengeResult) => userChallengeResult.challenge,
  )
  user_challenge_results: UserChallengeResult[];

  @OneToMany(() => UserClass, (userClass) => userClass.user, {
    createForeignKeyConstraints: false,
  })
  class: UserClass[];

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  toJSON() {
    const { password, ...userWithoutPassword } = this;
    return userWithoutPassword;
  }
}
