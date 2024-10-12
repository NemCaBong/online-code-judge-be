import { UserChallengeResult } from 'src/challenges/entities/user-challenge-result.entity';
import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ length: 30 })
  firstName: string;

  @Column({ length: 30 })
  lastName: string;

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
  userChallengeResults: UserChallengeResult[];

  toJSON() {
    const { password, ...userWithoutPassword } = this;
    return userWithoutPassword;
  }
}
