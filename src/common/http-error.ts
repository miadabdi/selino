import { HttpException, HttpStatus } from "@nestjs/common";

export function throwHttpError(
  status: HttpStatus,
  error: string,
  field?: string,
): never {
  throw new HttpException(field ? { error, field } : { error }, status);
}
