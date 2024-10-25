import { Type } from 'class-transformer';
import { IsNumber, IsString, MinLength } from 'class-validator';

export class EvaluateExerciseDto {
  @IsString()
  score: string;

  @IsString()
  @MinLength(10)
  evaluation: string;
}
