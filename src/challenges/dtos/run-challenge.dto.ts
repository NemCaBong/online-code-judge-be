import {
  IsArray,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsString,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SupportedLanguageId } from 'src/common/enums/supported-language.enum';

export class RunChallengeDto {
  @IsNumber()
  @Type(() => Number)
  @IsIn(Object.keys(SupportedLanguageId).map(Number), {
    message: 'Invalid language ID',
  })
  languageId: number;

  @IsString()
  @IsNotEmpty()
  @MinLength(51, { message: 'Code must be longer than 50 characters' })
  code: string;

  @IsArray()
  @IsNotEmpty()
  @Type(() => Number)
  testCaseIds: number[];
}
