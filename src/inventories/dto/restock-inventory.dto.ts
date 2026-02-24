import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsInt, Min } from "class-validator";

export class RestockInventoryDto {
  @ApiProperty()
  @IsInt()
  @Min(1)
  qty!: number;

  @ApiProperty({ enum: ["restock", "adjustment"] })
  @IsIn(["restock", "adjustment"])
  reason!: "restock" | "adjustment";
}
