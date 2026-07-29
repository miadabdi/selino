import { ApiPropertyOptional } from "@nestjs/swagger";
import { UpdateBusinessAccountDto } from "./update-business-account.dto";

export class UpdateBusinessAccountBody extends UpdateBusinessAccountDto {
  @ApiPropertyOptional({
    description: "Business account logo image",
    type: "string",
    format: "binary",
  })
  logo?: unknown;

  @ApiPropertyOptional({
    description: "Business-license image",
    type: "string",
    format: "binary",
  })
  license?: unknown;
}
