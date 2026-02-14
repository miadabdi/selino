import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsInt, IsNotEmpty, IsString, Min } from "class-validator";
import { BUCKET_KEYS, type BucketKey } from "../../storage/index.js";

export class UploadIntentDto {
  @ApiProperty({
    description: "The bucket key to upload to",
    example: "productMedia",
    enum: BUCKET_KEYS,
  })
  @IsNotEmpty()
  @IsString()
  @IsIn(BUCKET_KEYS)
  bucketKey: BucketKey;

  @ApiProperty({
    description: "Original filename",
    example: "photo.jpg",
  })
  @IsNotEmpty()
  @IsString()
  filename: string;

  @ApiProperty({
    description: "MIME type of the file",
    example: "image/jpeg",
  })
  @IsNotEmpty()
  @IsString()
  mimetype: string;

  @ApiProperty({
    description: "File size in bytes",
    example: 1048576,
  })
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  sizeInBytes: number;
}
