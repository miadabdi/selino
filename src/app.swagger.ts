import { applyDecorators } from "@nestjs/common";
import { ApiOkResponse, ApiOperation } from "@nestjs/swagger";
import { HealthResponse } from "./responses/index";
import { PublicApi } from "./swagger/swagger.decorators";

export const ControllerDocs = () => PublicApi("App");

export const GetWelcome = () =>
  applyDecorators(
    ApiOperation({
      summary: "Open the API root",
      description:
        "Returns a small greeting that confirms the HTTP application is reachable. Use `/health` for a machine-readable health probe.",
    }),
    ApiOkResponse({ description: "The Selino API greeting.", type: String }),
  );

export const GetHealth = () =>
  applyDecorators(
    ApiOperation({
      summary: "Check service health",
      description:
        "Returns the current service status and server timestamp. This endpoint does not require authentication and is suitable for uptime probes.",
    }),
    ApiOkResponse({
      description: "The service is accepting HTTP requests.",
      type: HealthResponse,
    }),
  );
