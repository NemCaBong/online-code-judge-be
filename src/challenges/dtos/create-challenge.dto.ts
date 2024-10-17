import {
  IsString,
  IsArray,
  ValidateNested,
  IsNotEmpty,
  IsNumber,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DifficultyEnum } from 'src/common/enums/difficulty.enum';

class TagDto {
  @IsString()
  @IsNotEmpty()
  label: string;

  @IsString()
  @IsNotEmpty()
  value: string;

  @IsNumber()
  @Type(() => Number)
  id: number;
}

class HintDto {
  @IsString()
  @IsNotEmpty()
  hintQuestion: string;

  @IsString()
  @IsNotEmpty()
  hintAnswer: string;
}

export class CreateChallengeDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TagDto)
  tags: TagDto[];

  @IsEnum(DifficultyEnum)
  @IsNotEmpty()
  difficulty: DifficultyEnum;

  @IsString()
  @IsNotEmpty()
  markdownContent: string;

  @IsString()
  @IsNotEmpty()
  boilerplate_code: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HintDto)
  hints: HintDto[];

  @IsNumber()
  timeLimit: number;

  @IsNumber()
  spaceLimit: number;
}
