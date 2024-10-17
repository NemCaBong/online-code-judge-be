import { Type } from 'class-transformer';
import { IsArray, IsNumber, IsUUID, ValidateNested } from 'class-validator';

export class RunPollDataDto {
  @IsUUID()
  token: string;

  @IsNumber()
  @Type(() => Number)
  testCaseId: number;
}

export class RunPollDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RunPollDataDto)
  runPoll: RunPollDataDto[];
}
