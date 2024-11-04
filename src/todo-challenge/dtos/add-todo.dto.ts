import { Type } from 'class-transformer';
import { IsInt } from 'class-validator';

export class AddTodoDto {
  @Type(() => Number)
  @IsInt()
  challengeId: number;
}
