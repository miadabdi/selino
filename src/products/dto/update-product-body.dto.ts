import { ApiPropertyOptional } from "@nestjs/swagger";
import { UpdateProductDto } from "./update-product.dto.js";

export class UpdateProductBody extends UpdateProductDto {
  @ApiPropertyOptional({
    description: "Product pictures",
    type: "array",
    items: { type: "string", format: "binary" },
  })
  pictures?: Express.Multer.File[];
}
