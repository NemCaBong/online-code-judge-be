import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, LessThanOrEqual, Repository } from 'typeorm';
import { Class } from './entities/class.entity';
import { CreateClassDto } from './dtos/create-class.dto';
import slugify from 'slugify';
import { UserClass } from './entities/user-class.entity';
import { randomBytes } from 'crypto';

@Injectable()
export class ClassService {
  constructor(
    @InjectRepository(Class) private classRepo: Repository<Class>,
    @InjectRepository(UserClass)
    private readonly userClassRepo: Repository<UserClass>,
    private readonly dataSource: DataSource,
  ) {}

  async getClassesOfUser(userId: number): Promise<Class[]> {
    return await this.classRepo
      .createQueryBuilder('c')
      .innerJoinAndSelect('c.user_classes', 'uc', 'uc.class_id = c.id')
      .innerJoinAndSelect('c.teacher', 't', 't.id = c.teacher_id')
      .where('uc.user_id = :userId', { userId })
      .orderBy('c.created_at', 'DESC')
      .select([
        'c.id',
        'c.name',
        'c.created_at',
        'c.total_students',
        'c.is_done',
        'c.slug',
        't.id',
        't.first_name',
        't.last_name',
        't.email',
      ])
      .getMany();
  }

  async getNumberOfDoneClassesOfUser(userId: number): Promise<number> {
    return await this.classRepo
      .createQueryBuilder('c')
      .innerJoinAndSelect('c.user_classes', 'uc', 'uc.class_id = c.id')
      .where('uc.user_id = :userId', { userId })
      .andWhere('c.is_done = :isDone', { isDone: true })
      .getCount();
  }

  async getTotalClassesOfUser(userId: number): Promise<number> {
    return await this.classRepo
      .createQueryBuilder('c')
      .innerJoinAndSelect('c.user_classes', 'uc', 'uc.class_id = c.id')
      .where('uc.user_id = :userId', { userId })
      .getCount();
  }

  async createClass(classData: CreateClassDto): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const randomString = randomBytes(3).toString('hex');
      const newClass = this.classRepo.create({
        name: classData.name,
        slug: `${slugify(classData.name, {
          lower: true,
          strict: true,
        })}-${randomString}`,
        total_students: classData.students.length,
        teacher_id: classData.teacher_id,
      });

      // Save the new class to the database
      const savedClass = await queryRunner.manager.save(newClass);

      const userClasses = [
        {
          user_id: 44,
          class_id: savedClass.id,
        },
        {
          user_id: classData.teacher_id,
          class_id: savedClass.id,
        },
        ...classData.students.map((student) => ({
          user_id: student.value,
          class_id: savedClass.id,
        })),
      ];
      await queryRunner.manager.save(UserClass, userClasses);
      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getAllClassesOfUser(userId: number): Promise<Class[]> {
    return await this.classRepo
      .createQueryBuilder('c')
      .innerJoinAndSelect('c.user_classes', 'uc', 'uc.class_id = c.id')
      .innerJoinAndSelect('c.teacher', 't')
      .where('uc.user_id = :userId', { userId })
      .orderBy('c.created_at', 'DESC')
      .select([
        'c.id',
        'c.name',
        'c.created_at',
        'c.total_students',
        'c.slug',
        't.id',
        't.first_name',
        't.last_name',
        't.email',
      ])
      .getMany();
  }

  async countClassesInSystem(): Promise<number> {
    return await this.classRepo.count();
  }

  async countClassesUntilLastMonth(): Promise<number> {
    const lastMonth = new Date();
    lastMonth.setDate(0);
    lastMonth.setHours(23, 59, 59, 999);
    return await this.classRepo.count({
      where: { created_at: LessThanOrEqual(lastMonth) },
    });
  }

  async getPosts(classSlug: string): Promise<Class> {
    return await this.classRepo
      .createQueryBuilder('c')
      .innerJoinAndSelect('c.posts', 'p')
      .where('c.slug = :slug', { slug: classSlug })
      .orderBy('p.created_at', 'DESC')
      .select(['p.id', 'p.content', 'p.created_at'])
      .execute();
  }

  async getAClass(classSlug: string): Promise<Class> {
    return await this.classRepo
      .createQueryBuilder('c')
      .innerJoinAndSelect('c.teacher', 't')
      .leftJoinAndSelect('c.posts', 'p')
      .where('c.slug = :slug', { slug: classSlug })
      .orderBy('p.created_at', 'DESC')
      .select([
        'c.id',
        'c.name',
        'c.slug',
        'c.total_students',
        'c.created_at',
        'c.is_done',
        't.id',
        't.first_name',
        't.last_name',
        't.email',
        'p.id',
        'p.content',
        'p.created_at',
      ])
      .getOne();
  }

  async getAllClassOfATeacher(teacherId: number): Promise<Class[]> {
    return await this.classRepo
      .createQueryBuilder('c')
      .where('c.teacher_id = :teacherId', { teacherId })
      .andWhere('c.is_done = :isDone', { isDone: false })
      .select(['c.id', 'c.name', 'c.created_at', 'c.slug', 'c.is_done'])
      .getMany();
  }
}
