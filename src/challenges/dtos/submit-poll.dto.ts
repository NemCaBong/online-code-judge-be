import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SubmitPollDataDto {
  @IsUUID()
  token: string;

  @IsNumber()
  @Type(() => Number)
  testCaseId: number;
}
export class SubmitPollDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SubmitPollDataDto)
  submitPoll: SubmitPollDataDto[];
}
