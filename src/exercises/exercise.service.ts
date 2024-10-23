import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, LessThanOrEqual, Repository } from 'typeorm';
import { UserClass } from 'src/classes/entities/user-class.entity';
import { Exercise } from './entities/exercise.entity';
import { ClassService } from '../classes/class.service';
import { CreateExerciseDto } from './dtos/create-exercise.dto';
import { ExerciseDetail } from './entities/exercise-detail.entity';
import { LANGUAGE_MAP } from 'src/common/constants';
import slugify from 'slugify';
import { UserExerciseResult } from './entities/user-exercise-result.entity';
import { UserExerciseStatus } from 'src/common/enums/user-exercise-status.enum';

@Injectable()
export class ExerciseService {
  constructor(
    @InjectRepository(UserClass)
    private userClassRepository: Repository<UserClass>,
    @InjectRepository(Exercise)
    private readonly exerciseRepo: Repository<Exercise>,
    @InjectRepository(ExerciseDetail)
    private readonly exerciseDetailRepo: Repository<ExerciseDetail>,
    @InjectRepository(UserExerciseResult)
    private readonly userExerciseResultRepo: Repository<UserExerciseResult>,
    private readonly classService: ClassService,
    private readonly dataSource: DataSource,
  ) {}

  async getUserSoonDueExercises(userId: number): Promise<Exercise[]> {
    const userClasses = await this.userClassRepository.find({
      select: { class_id: true },
      where: { user_id: userId },
    });
    const classIds = userClasses.map((uc) => uc.class_id);

    if (classIds.length === 0) {
      return []; // Return an empty array if the user has no classes
    }

    return await this.exerciseRepo
      .createQueryBuilder('e')
      .innerJoinAndSelect('e.class', 'class')
      .leftJoinAndSelect(
        'e.user_exercise_results',
        'uer',
        'uer.user_id = :userId',
        { userId },
      )
      .where('e.class_id IN (:...classIds)', { classIds })
      .orderBy('e.due_at', 'DESC')
      .select([
        'uer.status',
        'e.due_at',
        'e.id',
        'e.name',
        'e.created_at',
        'e.slug',
        'class.id', // Select class information
        'class.name', // Assuming class has a name field
      ])
      .getMany();
  }

  async getNumberOfDoneExercises(userId: number): Promise<number> {
    const classesOfUser = await this.classService.getClassesOfUser(userId);
    const classIds = classesOfUser.map((classItem) => classItem.id);
    if (classIds.length === 0) {
      return 0;
    }
    return await this.exerciseRepo
      .createQueryBuilder('e')
      .leftJoinAndSelect(
        'e.user_exercise_results',
        'uer',
        'uer.user_id = :userId',
        { userId },
      )
      .where('uer.status = :status', { status: 'done' })
      .orWhere('uer.status = :status', { status: 'graded' })
      .andWhere('e.class_id IN (:...classIds)', { classIds })
      .getCount();
  }

  async getTotalExercises(userId: number): Promise<number> {
    const classesOfUser = await this.classService.getClassesOfUser(userId);
    const classIds = classesOfUser.map((classItem) => classItem.id);
    if (classIds.length === 0) {
      return 0;
    }
    return await this.exerciseRepo
      .createQueryBuilder('e')
      .where('e.class_id IN (:...classIds)', { classIds })
      .getCount();
  }

  async createExercise(createExerciseDto: CreateExerciseDto) {
    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Create a new Exercise instance
      const exercise = new Exercise();
      exercise.name = createExerciseDto.name;
      exercise.description = createExerciseDto.markdownContent;
      // exercise.slug = slugify(createExerciseDto.name, { lower: true });
      exercise.due_at = createExerciseDto.due_at;
      exercise.class_id = createExerciseDto.class_id;

      // Save the new exercise to the database
      const savedExercise = await queryRunner.manager.save(exercise);

      // Create ExerciseDetail entries
      const exerciseDetails = createExerciseDto.boilerplate_codes.map(
        (exerciseDetail) => {
          const newExerciseDetail = new ExerciseDetail();
          newExerciseDetail.boilerplate_code = exerciseDetail.code;
          newExerciseDetail.file_name = exerciseDetail.fileName;
          newExerciseDetail.language_id =
            LANGUAGE_MAP[exerciseDetail.language.toLowerCase()];
          newExerciseDetail.exercise_id = savedExercise.id;
          return newExerciseDetail;
        },
      );

      // Save ExerciseDetail entries to the database
      await queryRunner.manager.save(ExerciseDetail, exerciseDetails);

      // Commit the transaction
      await queryRunner.commitTransaction();
    } catch (error) {
      // Rollback the transaction in case of error
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      // Release the query runner
      await queryRunner.release();
    }
  }

  async countExercisesInSystem(): Promise<number> {
    return await this.exerciseRepo.count();
  }

  async countExercisesUntilLastMonth(): Promise<number> {
    const lastMonth = new Date();
    lastMonth.setDate(0);
    lastMonth.setHours(23, 59, 59, 999);
    return await this.exerciseRepo.count({
      where: { created_at: LessThanOrEqual(lastMonth) },
    });
  }

  async getScoreOfUserInAClass(userId: number, classSlug: string) {
    const classBySlug = await this.classService.getAClass(classSlug);
    if (!classBySlug) {
      throw new BadRequestException('Class not found');
    }

    const currentDate = new Date();

    const exercises = await this.exerciseRepo
      .createQueryBuilder('e')
      .where('e.class_id = :classId', { classId: classBySlug.id })
      .getMany();

    const userExerciseResults = await this.userExerciseResultRepo.find({
      where: {
        user_id: userId,
        class_id: classBySlug.id,
      },
    });

    let totalScore = 0;
    let count = 0;
    const overdueExercises = [];

    for (const exercise of exercises) {
      const userResult = userExerciseResults.find(
        (uer) => uer.exercise_id === exercise.id,
      );
      // not done and overdue
      if (!userResult && exercise.due_at < currentDate) {
        const overdueExercise = this.userExerciseResultRepo.create({
          user_id: userId,
          exercise_id: exercise.id,
          class_id: classBySlug.id,
          status: UserExerciseStatus.OVERDUE,
          score: 0,
        });
        overdueExercises.push(overdueExercise);
        count += 1;
      }

      // done and have graded
      if (userResult && userResult.status === UserExerciseStatus.GRADED) {
        totalScore += parseFloat(userResult.score.toString());
        count += 1;
      }
      // overdue
      if (userResult && userResult.status === UserExerciseStatus.OVERDUE) {
        count += 1;
      }
      // TH nộp muộn hơn thời gian hết hạn sẽ đc xem xét tự động tại phần nộp bài
    }
    await this.userExerciseResultRepo.save(overdueExercises);
    return parseFloat((totalScore / count).toFixed(2));
  }

  async getGradedExercises(userId: number, classSlug: string) {
    const classBySlug = await this.classService.getAClass(classSlug);
    if (!classBySlug) {
      throw new BadRequestException('Class not found');
    }

    const graded = await this.userExerciseResultRepo.find({
      where: {
        user_id: userId,
        class_id: classBySlug.id,
        status: UserExerciseStatus.GRADED,
      },
      relations: ['exercise'],
    });
    return graded;
  }

  async getAssignedExercises(userId: number, classSlug: string) {
    const classBySlug = await this.classService.getAClass(classSlug);

    if (!classBySlug) {
      throw new BadRequestException('Class not found');
    }

    const assigned = await this.exerciseRepo
      .createQueryBuilder('e')
      .innerJoinAndSelect('e.class', 'c')
      .leftJoinAndSelect(
        'e.user_exercise_results',
        'uer',
        'uer.user_id = :userId',
        { userId },
      )
      .where('c.id = :classId', {
        classId: classBySlug.id,
      })
      .select([
        'e.id',
        'e.name',
        'e.description',
        'e.due_at',
        'e.created_at',
        'e.updated_at',
        'e.slug',
        'c.id',
        'c.name',
        'uer.status',
        'uer.score',
      ])
      .getMany();

    return assigned;
  }
}
