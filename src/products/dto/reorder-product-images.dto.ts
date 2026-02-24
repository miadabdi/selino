import { ApiProperty } from "@nestjs/swagger";
import { IsArray, IsInt } from "class-validator";

export class ReorderProductImagesDto {
  @ApiProperty({ type: [Number] })
  @IsArray()
  @IsInt({ each: true })
  imageIds!: number[];
}
