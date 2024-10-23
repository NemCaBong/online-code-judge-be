import {
  IsString,
  IsArray,
  ValidateNested,
  IsNotEmpty,
  IsEnum,
  IsNumber,
  IsDate,
} from 'class-validator';
import { Type } from 'class-transformer';

class BoilerplateCodeDto {
  @IsString()
  @IsNotEmpty()
  // @IsEnum(SupportedLanguage, { message: 'Invalid language selected' })
  language: string;

  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsNotEmpty()
  fileName: string;
}

export class CreateExerciseDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  markdownContent: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BoilerplateCodeDto)
  boilerplate_codes: BoilerplateCodeDto[];

  @IsNumber()
  @Type(() => Number)
  class_id: number;

  @IsDate()
  @Type(() => Date)
  due_at: Date;
}
