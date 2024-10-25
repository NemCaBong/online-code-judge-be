import { Type } from 'class-transformer';
import {
  IsArray,
  IsNumber,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class CodeDto {
  @IsNumber()
  @Type(() => Number)
  id: number;

  @IsString()
  file_name: string;

  @IsNumber()
  language_id: number;

  @IsString()
  @MinLength(1)
  boilerplate_code: string;
}

export class RunExerciseDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CodeDto)
  codes: CodeDto[];
}
