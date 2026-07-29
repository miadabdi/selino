import { ApiProperty } from "@nestjs/swagger";
import { IsInt, Min } from "class-validator";

export class UpdatePurchaseRequestItemDto {
  @ApiProperty({
    description: "The new absolute quantity for the open request item.",
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  qty!: number;
}
