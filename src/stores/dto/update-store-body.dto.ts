import { ApiPropertyOptional } from "@nestjs/swagger";
import { UpdateStoreDto } from "./update-store.dto.js";

export class UpdateStoreBody extends UpdateStoreDto {
  @ApiPropertyOptional({
    description: "Store logo image",
    type: "string",
    format: "binary",
  })
  logo?: Express.Multer.File;
}
