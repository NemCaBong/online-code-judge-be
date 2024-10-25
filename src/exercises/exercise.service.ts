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
import { RunExerciseDto } from './dtos/run-exercise.dto';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import axios from 'axios';
import { exec } from 'child_process';
import { promisify } from 'util';
import { UserExerciseDetail } from './entities/user-exercise-detail';

const execPromise = promisify(exec);

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
    @InjectRepository(UserExerciseDetail)
    private readonly userExerciseDetailRepo: Repository<UserExerciseDetail>,
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

  async getAnExercise(classSlug: string, exerciseId: number, userId: number) {
    const thatClass = await this.classService.getAClass(classSlug);
    if (!thatClass) {
      throw new BadRequestException('Class not found');
    }
    const exercise = await this.exerciseRepo
      .createQueryBuilder('e')
      .leftJoinAndSelect('e.class', 'c')
      .leftJoinAndSelect('e.exercise_details', 'ed')
      .leftJoinAndSelect(
        'e.user_exercise_results',
        'uer',
        'uer.user_id = :userId',
        { userId },
      )
      .leftJoinAndSelect(
        'uer.user_exercise_details',
        'ued',
        'ued.user_exercise_id = uer.id',
      )
      .where('e.id = :exerciseId', { exerciseId })
      .getOne();
    if (!exercise || exercise.class.id !== thatClass.id) {
      throw new BadRequestException('Exercise not found');
    }

    return exercise;
  }

  async runExercise(
    exerciseId: number,
    runExerciseDto: RunExerciseDto,
    userId: number,
  ) {
    const exercise = await this.exerciseRepo.findOne({
      where: { id: exerciseId },
    });
    if (!exercise) {
      throw new BadRequestException('Exercise not found');
    }

    const projectRoot = process.cwd();
    const tempBaseDir = path.join(projectRoot, 'temp');
    const tmpDir = path.join(
      tempBaseDir,
      `exercise-${exerciseId}-${Date.now()}`,
    );
    const additionalFilesDir = path.join(tmpDir, 'additional_files');

    // Create temp directories if they don't exist
    await fs.mkdir(tempBaseDir, { recursive: true });
    await fs.mkdir(tmpDir, { recursive: true });
    await fs.mkdir(additionalFilesDir);

    try {
      const javaFiles = runExerciseDto.codes
        .filter((code) => code.file_name.endsWith('.java'))
        .map((code) => code.file_name);

      // Create compile script with Main.java and all supporting files
      await fs.writeFile(
        path.join(additionalFilesDir, 'compile'),
        `#!/bin/bash\n/usr/local/openjdk13/bin/javac ${javaFiles.join(' ')}`,
        { mode: 0o755 },
      );

      // Run script will always execute Main class
      await fs.writeFile(
        path.join(additionalFilesDir, 'run'),
        '#!/bin/bash\n/usr/local/openjdk13/bin/java Main',
        { mode: 0o755 },
      );

      for (const code of runExerciseDto.codes) {
        await fs.writeFile(
          path.join(additionalFilesDir, code.file_name),
          code.boilerplate_code,
        );
      }

      const { stdout: zippedBase64 } = await execPromise(
        `cd "${additionalFilesDir}" && zip -r - . | base64 -w0`,
      );

      const response = await axios.post(
        'http://localhost:2358/submissions?base64_encoded=true&wait=true',
        {
          source_code: '',
          language_id: 89,
          additional_files: zippedBase64,
        },
        {
          headers: {
            'X-Auth-Token': 't2UFBewPFQcqnMwPaPmmBChpy7P9T6tT',
          },
        },
      );
      const { stdout, stderr, compile_output, ...rest } = response.data;
      const result = {
        stderr: stderr ? Buffer.from(stderr, 'base64').toString('utf-8') : null,
        stdout: stdout ? Buffer.from(stdout, 'base64').toString('utf-8') : null,
        compile_output: compile_output
          ? Buffer.from(compile_output, 'base64').toString('utf-8')
          : null,
        ...rest,
      };

      return result;
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  }

  async submitExercise(
    exerciseId: number,
    submitExerciseDto: RunExerciseDto,
    userId: number,
    classSlug: string,
  ) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Find the class
      const thatClass = await this.classService.getAClass(classSlug);
      if (!thatClass) {
        throw new BadRequestException('Class not found');
      }

      // Check if user has already submitted
      const existingResult = await this.userExerciseResultRepo.findOne({
        where: {
          exercise: { id: exerciseId },
          user: { id: userId },
          class: { id: thatClass.id },
        },
      });

      if (existingResult) {
        throw new BadRequestException(
          'You have already submitted this exercise',
        );
      }

      // Create and save the UserExerciseResult
      const newlyUserExerciseResult = this.userExerciseResultRepo.create({
        user_id: userId,
        exercise_id: exerciseId,
        class_id: thatClass.id,
        status: 'submitted',
        submitted_at: new Date(),
      });

      const savedUserExerciseResult = await queryRunner.manager.save(
        newlyUserExerciseResult,
      );

      // Create UserExerciseDetail entries
      const userExerciseDetails = submitExerciseDto.codes.map((item) => {
        return this.userExerciseDetailRepo.create({
          file_name: item.file_name,
          code: item.boilerplate_code,
          language_id: item.language_id,
          user_exercise_id: savedUserExerciseResult.id,
        });
      });

      // Save UserExerciseDetail entries
      await queryRunner.manager.save(UserExerciseDetail, userExerciseDetails);
      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
