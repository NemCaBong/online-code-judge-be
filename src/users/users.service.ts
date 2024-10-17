import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import * as XLSX from 'xlsx';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  async findOne(email: string): Promise<User | undefined> {
    return this.userRepo.findOne({ where: { email } });
  }

  async create(user: Partial<User>): Promise<User> {
    const newUser = this.userRepo.create(user);
    return this.userRepo.save(newUser);
  }

  async getAllStudents(): Promise<User[]> {
    return await this.userRepo.find({
      select: ['id', 'first_name', 'last_name'],
      where: { role: 'STUDENT' },
    });
  }

  async createUsersFromXlsx(file: Express.Multer.File): Promise<void> {
    // Read the XLSX file from the buffer
    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    console.log(sheetName);
    const worksheet = workbook.Sheets[sheetName];

    // Convert the sheet to JSON
    const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet);
    const passwd = await bcrypt.hash('12345', 10);
    // Map JSON data to User entities
    const users = jsonData.map((data) => {
      // Set other fields as necessary
      return {
        first_name: data['First Name'],
        last_name: data['Last Name'],
        email: data['Email'],
        role: data['Role'],
        password: passwd,
      };
    });
    console.log(users);
    const data = this.userRepo.create(users);
    // Save users to the database
    await this.userRepo.save(data);
  }
}
