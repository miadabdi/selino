import { ApiProperty } from "@nestjs/swagger";
import { IsInt, Min } from "class-validator";

export class AddPurchaseRequestItemDto {
  @ApiProperty()
  @IsInt()
  storeInventoryId!: number;

  @ApiProperty()
  @IsInt()
  @Min(1)
  qty!: number;
}
