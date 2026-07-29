import { ApiProperty } from "@nestjs/swagger";
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsIn,
  IsInt,
  Min,
} from "class-validator";

export class ExportInvoicesDto {
  @ApiProperty({ enum: ["purchase", "sale"] })
  @IsIn(["purchase", "sale"])
  direction!: "purchase" | "sale";

  @ApiProperty({ enum: ["active", "history"] })
  @IsIn(["active", "history"])
  view!: "active" | "history";

  @ApiProperty({ type: [Number], minItems: 1, maxItems: 100 })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(100)
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  invoiceIds!: number[];
}
