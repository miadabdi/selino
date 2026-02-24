import { ApiProperty } from "@nestjs/swagger";

export class MessageResponse {
  @ApiProperty({
    description: "A human-readable status message",
    example: "Operation completed successfully",
  })
  message: string;
}
