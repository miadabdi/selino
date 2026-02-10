import { ApiProperty } from "@nestjs/swagger";

export class HealthResponse {
  @ApiProperty({ description: "Service status", example: "ok" })
  status: string;

  @ApiProperty({
    description: "Current server timestamp in ISO 8601 format",
    example: "2026-02-10T12:00:00.000Z",
  })
  timestamp: string;
}
