import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class FileResponse {
  @ApiProperty({ description: "File ID", example: 1 })
  id: number;

  @ApiProperty({ description: "Original filename", example: "photo.jpg" })
  filename: string;

  @ApiProperty({ description: "MIME type", example: "image/jpeg" })
  mimetype: string | null;

  @ApiPropertyOptional({
    description: "File size in bytes",
    example: 1048576,
  })
  sizeInBytes: number | null;

  @ApiProperty({
    description: "File status",
    example: "ready",
    enum: ["pending", "ready", "failed"],
  })
  status: string;

  @ApiProperty({
    description: "Whether the file is publicly accessible",
    example: true,
  })
  isPublic: boolean;

  @ApiProperty({
    description: "Accessible URL for the file",
    example: "https://storage.example.com/bucket/uuid.jpg",
  })
  url: string;

  @ApiProperty({ description: "Created timestamp" })
  createdAt: Date;
}
