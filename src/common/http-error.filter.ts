import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from "@nestjs/common";
import type { Response } from "express";

@Catch(HttpException)
export class HttpErrorFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const payload = exception.getResponse();

    if (typeof payload === "object" && payload != null) {
      const obj = payload as {
        error?: unknown;
        field?: unknown;
        message?: unknown;
      };

      if (Array.isArray(obj.message) && typeof obj.message[0] === "string") {
        const first = obj.message[0];
        const field = first.split(" ")[0] || undefined;
        response.status(status).json({ error: first, field });
        return;
      }

      if (typeof obj.error === "string") {
        const normalizedError =
          obj.error === "Bad Request Exception" ? "Bad Request" : obj.error;

        response
          .status(status)
          .json(
            typeof obj.field === "string"
              ? { error: normalizedError, field: obj.field }
              : { error: normalizedError },
          );
        return;
      }

      if (typeof obj.message === "string") {
        response.status(status).json({ error: obj.message });
        return;
      }
    }

    if (typeof payload === "string") {
      response.status(status).json({ error: payload });
      return;
    }

    response.status(status).json({ error: "Request failed" });
  }
}
