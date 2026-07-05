import { ApiProperty } from "@nestjs/swagger";
import { IsInt, IsString, MaxLength, MinLength } from "class-validator";

export class AddBusinessMemberDto {
  @ApiProperty()
  @IsInt()
  userId!: number;

  @ApiProperty({
    description: "Stable role key from roles.name",
    examples: ["manager", "seller", "collector"],
  })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  role!: string;
}
