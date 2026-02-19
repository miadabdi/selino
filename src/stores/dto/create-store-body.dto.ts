import { ApiPropertyOptional } from "@nestjs/swagger";
import { CreateStoreDto } from "./create-store.dto.js";

export class CreateStoreBody extends CreateStoreDto {
  @ApiPropertyOptional({
    description: "Store logo image",
    type: "string",
    format: "binary",
  })
  logo?: Express.Multer.File;
}
