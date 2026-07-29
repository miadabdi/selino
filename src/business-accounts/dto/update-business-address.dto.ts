import { PartialType } from "@nestjs/swagger";
import { CreateBusinessAddressDto } from "./create-business-address.dto.js";

export class UpdateBusinessAddressDto extends PartialType(
  CreateBusinessAddressDto,
) {}
