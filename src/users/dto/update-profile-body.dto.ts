import { ApiPropertyOptional } from "@nestjs/swagger";
import { UpdateUserDto } from "./update-user.dto";

/**
 * Swagger body schema for `PUT /users/me` (multipart/form-data).
 * Combines text fields with an optional profile picture file upload.
 */
export class UpdateProfileBody extends UpdateUserDto {
  @ApiPropertyOptional({
    description: "Profile picture image file",
    type: "string",
    format: "binary",
  })
  profilePicture?: Express.Multer.File;
}
