import { ApiPropertyOptional } from "@nestjs/swagger";
import { CreateProductDto } from "./create-product.dto.js";

export class CreateProductBody extends CreateProductDto {
  @ApiPropertyOptional({
    description: "Product pictures",
    type: "array",
    items: { type: "string", format: "binary" },
  })
  pictures?: Express.Multer.File[];
}
