import { ApiProperty } from "@nestjs/swagger";
import { IsObject } from "class-validator";
import type { CategorySpecSchema } from "../../database/schema/categories.schema";

export class ReplaceSpecSchemaDto {
  @ApiProperty({ type: Object })
  @IsObject()
  specSchema!: CategorySpecSchema;
}
