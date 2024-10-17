import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsString, MinLength } from 'class-validator';

export class SubmitChallengeDto {
  @IsNumber()
  @Type(() => Number)
  languageId: number;

  @IsString()
  @IsNotEmpty()
  @MinLength(51, { message: 'Code must be longer than 50 characters' })
  code: string;
}
