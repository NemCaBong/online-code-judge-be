import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { UserClass } from 'src/classes/entities/user-class.entity';
import { Exercise } from './entities/exercise.entity';
import { ClassService } from '../classes/class.service';
import { CreateExerciseDto } from './dtos/create-exercise.dto';
import { ExerciseDetail } from './entities/exercise-detail.entity';
import { LANGUAGE_MAP } from 'src/common/constants';
import slugify from 'slugify';

@Injectable()
export class ExerciseService {
  constructor(
    @InjectRepository(UserClass)
    private userClassRepository: Repository<UserClass>,
    @InjectRepository(Exercise)
    private readonly exerciseRepo: Repository<Exercise>,
    @InjectRepository(ExerciseDetail)
    private readonly exerciseDetailRepo: Repository<ExerciseDetail>,
    private readonly classService: ClassService,
    private readonly dataSource: DataSource,
  ) {}

  async getUserExercises(userId: number): Promise<any[]> {
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
      .innerJoinAndSelect('e.classExercises', 'ce')
      .innerJoinAndSelect('ce.class', 'class') // Join with the Class entity
      .leftJoinAndSelect(
        'e.userExerciseResult',
        'uer',
        'uer.user_id = :userId',
        { userId },
      )
      .where('ce.class_id IN (:...classIds)', { classIds })
      .orderBy('ce.due_at', 'DESC')
      .select([
        'uer.status',
        'ce.due_at',
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
    return await this.exerciseRepo
      .createQueryBuilder('e')
      .innerJoinAndSelect('e.classExercises', 'ce', 'ce.exercise_id = e.id')
      .leftJoinAndSelect(
        'e.userExerciseResult',
        'uer',
        'uer.user_id = :userId',
        { userId },
      )
      .where('uer.status = :status', { status: 'done' })
      .andWhere('ce.class_id IN (:...classIds)', { classIds })
      .getCount();
  }

  async getTotalExercises(userId: number): Promise<number> {
    const classesOfUser = await this.classService.getClassesOfUser(userId);
    const classIds = classesOfUser.map((classItem) => classItem.id);
    return await this.exerciseRepo
      .createQueryBuilder('e')
      .innerJoinAndSelect('e.classExercises', 'ce')
      .where('ce.class_id IN (:...classIds)', { classIds })
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
      exercise.slug = slugify(createExerciseDto.name, { lower: true });

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
}
