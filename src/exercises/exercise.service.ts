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
import { User } from 'src/users/user.entity';
import { Class } from 'src/classes/entities/class.entity';
import { EvaluateExerciseDto } from './dtos/evaluate-exercise.dto';

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
    // userId: number,
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
    console.log('tempBaseDir: ', tempBaseDir);
    console.log('tmpDir', tmpDir);

    const additionalFilesDir = path.join(tmpDir, 'additional_files');
    console.log('additionalFilesDir: ', additionalFilesDir);

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
      console.log('zippedBased64: ', zippedBase64);

      const response = await axios.post(
        `http://${process.env.NODE_ENV === 'production' ? 'judge0_server' : 'localhost'}:2358/submissions?base64_encoded=true&wait=true`,
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
    const currDate = new Date();
    try {
      const [thatClass, exercise] = await Promise.all([
        this.classService.getAClass(classSlug),
        this.exerciseRepo.findOne({ where: { id: exerciseId } }),
      ]);

      if (!thatClass) {
        throw new BadRequestException('Class not found');
      }

      if (!exercise) {
        throw new BadRequestException('Exercise not found');
      }

      // Check existing result
      const existingResult = await this.userExerciseResultRepo.findOne({
        where: {
          exercise: { id: exerciseId },
          user: { id: userId },
          class: { id: thatClass.id },
        },
        relations: ['user_exercise_details'],
      });

      if (existingResult && existingResult.status !== 'not-done') {
        throw new BadRequestException(
          'You have already submitted this exercise',
        );
      }
      let res: UserExerciseResult;
      if (existingResult && existingResult.status === 'not-done') {
        // Update existing record
        if (exercise.due_at < currDate) {
          existingResult.status = 'overdue';
          existingResult.score = 0;
        } else {
          existingResult.status = 'submitted';
        }
        existingResult.submitted_at = currDate;
        res = await queryRunner.manager.save(existingResult);
      } else {
        // Create new records
        const newlyUserExerciseResult = this.userExerciseResultRepo.create({
          user_id: userId,
          exercise_id: exerciseId,
          class_id: thatClass.id,
          status: 'submitted',
          submitted_at: new Date(),
        });

        res = await queryRunner.manager.save(newlyUserExerciseResult);
      }

      // always create new userExerciseDetails when submitting
      const userExerciseDetails = submitExerciseDto.codes.map((item) => {
        return this.userExerciseDetailRepo.create({
          file_name: item.file_name,
          code: item.boilerplate_code,
          language_id: item.language_id,
          user_exercise_id: res.id,
        });
      });
      await queryRunner.manager.save(UserExerciseDetail, userExerciseDetails);

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getAllExercisesOfAClass(classSlug: string) {
    const thatClass = await this.classService.getAClass(classSlug);
    if (!thatClass) {
      throw new BadRequestException('Class not found');
    }
    return await this.exerciseRepo.find({
      where: { class: { id: thatClass.id } },
    });
  }

  async getAllUserExerciseResOfAExerciseAndClass(
    exerciseId: number,
    classSlug: string,
  ) {
    const [thatClass, exercise] = await Promise.all([
      this.classService.getAClass(classSlug),
      this.exerciseRepo.findOne({ where: { id: exerciseId } }),
    ]);

    const userClasses = await this.userClassRepository
      .createQueryBuilder('uc')
      .leftJoinAndSelect('uc.user', 'user')
      .leftJoinAndSelect(
        'user.user_exercise_results',
        'uer',
        'uer.exercise_id = :exerciseId AND uer.class_id = :classId',
        { exerciseId, classId: thatClass.id },
      )
      .leftJoinAndSelect('uer.user_exercise_details', 'ued')
      .where('uc.class_id = :classId', { classId: thatClass.id })
      .getMany();

    const exerciseDetails = await this.exerciseDetailRepo.find({
      where: { exercise_id: exerciseId },
    });

    const results = [];
    const currentDate = new Date();

    for (const userClass of userClasses) {
      const userId = userClass.user.id;
      let userExerciseResult = userClass.user.user_exercise_results[0];

      // Always create userExerciseResult if it doesn't exist
      if (!userExerciseResult) {
        const status = exercise.due_at < currentDate ? 'not-done' : 'overdue';
        if (status === 'not-done') {
          userExerciseResult = await this.userExerciseResultRepo.save({
            user_id: userId,
            exercise_id: exerciseId,
            class_id: thatClass.id,
            status: status,
            submitted_at: null,
          });
        } else {
          userExerciseResult = await this.userExerciseResultRepo.save({
            user_id: userId,
            exercise_id: exerciseId,
            class_id: thatClass.id,
            status: status,
            submitted_at: null,
            score: 0,
          });
        }

        // Always create corresponding userExerciseDetails
        const userExerciseDetails = await this.userExerciseDetailRepo.save(
          exerciseDetails.map((detail) => ({
            file_name: detail.file_name,
            code: '',
            language_id: detail.language_id,
            user_exercise_id: userExerciseResult.id,
          })),
        );

        userExerciseResult.user_exercise_details = userExerciseDetails;
      }
      const user = new User();
      user.id = userClass.user.id;
      user.first_name = userClass.user.first_name;
      user.last_name = userClass.user.last_name;
      user.email = userClass.user.email;
      user.role = userClass.user.role;
      user.created_at = userClass.user.created_at;

      userExerciseResult = {
        ...userExerciseResult,
        user,
      };
      results.push(userExerciseResult);
    }
    const aClass = new Class();
    aClass.id = thatClass.id;
    aClass.name = thatClass.name;
    aClass.slug = thatClass.slug;
    aClass.created_at = thatClass.created_at;
    return { user_exercise_results: results, aClass };
  }

  async evaluateExercise({
    exerciseId,
    classSlug,
    evaluateExerciseDto,
    userId,
    userExerciseResultId,
  }: {
    exerciseId: number;
    classSlug: string;
    evaluateExerciseDto: EvaluateExerciseDto;
    userId: number;
    userExerciseResultId: number;
  }) {
    const [thatClass, exercise] = await Promise.all([
      this.classService.getAClass(classSlug),
      this.exerciseRepo.findOne({ where: { id: exerciseId } }),
    ]);

    if (!thatClass || !exercise) {
      throw new BadRequestException('Class or exercise not found');
    }

    // Check if the user is the teacher of the class
    if (userId !== thatClass.teacher.id) {
      throw new BadRequestException(
        'Only the teacher of this class can evaluate exercises',
      );
    }

    // Update the exercise result
    const userExerciseResult = await this.userExerciseResultRepo.findOne({
      where: { id: userExerciseResultId },
    });

    if (!userExerciseResult) {
      throw new BadRequestException('Exercise result not found');
    }

    // Update evaluation and score
    userExerciseResult.evaluation = evaluateExerciseDto.evaluation;
    userExerciseResult.score = parseFloat(
      parseFloat(evaluateExerciseDto.score).toFixed(2),
    );
    userExerciseResult.status = UserExerciseStatus.GRADED;

    // Save the updated result
    return await this.userExerciseResultRepo.save(userExerciseResult);
  }
}
