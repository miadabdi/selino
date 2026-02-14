import { ApiProperty } from "@nestjs/swagger";

export class UploadIntentResponse {
  @ApiProperty({ description: "ID of the created file record", example: 1 })
  fileId: number;

  @ApiProperty({
    description: "Presigned PUT URL for uploading the file directly to storage",
    example: "https://storage.example.com/bucket/key?X-Amz-Signature=...",
  })
  uploadUrl: string;

  @ApiProperty({
    description: "Expiration time of the presigned URL",
    example: "2026-02-14T13:00:00.000Z",
  })
  expiresAt: string;
}
