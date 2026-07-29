import { Controller, Get } from "@nestjs/common";
import { AppService } from "./app.service";
import { HealthResponse } from "./responses/index";
import * as Swagger from "./app.swagger";

@Swagger.ControllerDocs()
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @Swagger.GetWelcome()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get("health")
  @Swagger.GetHealth()
  getHealth(): HealthResponse {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
    };
  }
}
