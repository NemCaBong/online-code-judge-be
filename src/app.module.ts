import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { ChallengeModule } from './challenges/challenges.module';
import { ClassModule } from './classes/class.module';
import { ExerciseModule } from './exercises/exercise.module';
import { DashboardService } from './dashboard/dashboard.service';
import { DashboardController } from './dashboard/dashboard.controller';
import { DashboardModule } from './dashboard/dashboard.module';
import { TagModule } from './tags/tag.module';
import { UserModule } from './users/user.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 8000,
      username: 'judge0',
      password: '12345',
      database: 'judge0',
      synchronize: true,
      autoLoadEntities: true,
    }),
    AuthModule,
    ChallengeModule,
    ClassModule,
    ExerciseModule,
    DashboardModule,
    TagModule,
    UserModule,
  ],
  controllers: [AppController, DashboardController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    DashboardService,
  ],
})
export class AppModule {}
