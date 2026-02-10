import { Controller, Get, HttpStatus } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { AppService } from "./app.service";
import { HealthResponse } from "./responses/index.js";

@ApiTags("App")
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: "Hello world" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Returns a greeting string",
    type: String,
  })
  getHello(): string {
    return this.appService.getHello();
  }

  @Get("health")
  @ApiOperation({ summary: "Health check" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Service health status",
    type: HealthResponse,
  })
  getHealth(): HealthResponse {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
    };
  }
}
