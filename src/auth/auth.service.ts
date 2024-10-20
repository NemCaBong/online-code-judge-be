import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import { User } from 'src/users/user.entity';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.userService.findOne(email);
    if (user && (await bcrypt.compare(password, user.password))) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: Partial<User>) {
    const payload = {
      email: user.email,
      id: user.id,
      role: user.role,
    };
    return {
      message: 'Success',
      status_code: 201,
      access_token: await this.jwtService.signAsync(payload),
    };
  }

  async signup(user: any) {
    const hashedPassword = await bcrypt.hash(user.password, 10);
    return this.userService.create({
      ...user,
      password: hashedPassword,
    });
  }
}
