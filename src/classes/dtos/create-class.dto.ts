import {
  IsString,
  IsArray,
  ValidateNested,
  IsNotEmpty,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';

class StudentDto {
  @IsString()
  @IsNotEmpty()
  label: string;

  @IsNumber()
  @Type(() => Number) // Convert value to number
  value: number;

  @IsNumber()
  id: number;
}

export class CreateClassDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StudentDto)
  students: StudentDto[];

  @IsNumber()
  @Type(() => Number) // Convert teacher to number
  teacher_id: number;
}
