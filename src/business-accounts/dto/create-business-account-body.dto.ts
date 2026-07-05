import { ApiPropertyOptional } from "@nestjs/swagger";
import { CreateBusinessAccountDto } from "./create-business-account.dto";

export class CreateBusinessAccountBody extends CreateBusinessAccountDto {
  @ApiPropertyOptional({
    description: "Business account logo image",
    type: "string",
    format: "binary",
  })
  logo?: unknown;
}
