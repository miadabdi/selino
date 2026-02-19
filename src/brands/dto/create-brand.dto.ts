import { ApiProperty } from "@nestjs/swagger";
import { IsString, MaxLength } from "class-validator";

export class CreateBrandDto {
  @ApiProperty()
  @IsString()
  @MaxLength(255)
  name!: string;
}
