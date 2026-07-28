import { applyDecorators } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
} from "@nestjs/swagger";
import { UploadIntentDto } from "./dto/index";
import { FileResponse, UploadIntentResponse } from "./responses/index";
import {
  ApiErrorResponse,
  NumericIdParam,
  PublicApi,
} from "../swagger/swagger.decorators";

export const ControllerDocs = () => PublicApi("Files");

export const CreateUploadIntent = () =>
  applyDecorators(
    ApiOperation({
      summary: "Prepare a direct file upload",
      description:
        "Validates the requested bucket, MIME type, and size; creates a pending file record; and returns a short-lived presigned PUT URL. Upload the bytes to that URL, then call the confirmation endpoint.",
    }),
    ApiBody({ type: UploadIntentDto }),
    ApiCreatedResponse({
      description: "A pending file record and presigned upload URL.",
      type: UploadIntentResponse,
    }),
    ApiBadRequestResponse({
      description: "The bucket, MIME type, or file size is not allowed.",
      type: ApiErrorResponse,
    }),
  );

export const ConfirmUpload = () =>
  applyDecorators(
    ApiOperation({
      summary: "Confirm a completed direct upload",
      description:
        "Checks that the pending object exists in storage, marks the file ready, and returns its metadata and resolved URL. Call this only after the presigned PUT upload succeeds.",
    }),
    NumericIdParam("id", "Pending file ID returned by the upload intent"),
    ApiOkResponse({
      description: "The confirmed, ready file.",
      type: FileResponse,
    }),
    ApiBadRequestResponse({
      description:
        "The file is not pending or the object is missing in storage.",
      type: ApiErrorResponse,
    }),
    ApiNotFoundResponse({
      description: "No file record exists with this ID.",
      type: ApiErrorResponse,
    }),
  );

export const DeleteFile = () =>
  applyDecorators(
    ApiOperation({
      summary: "Delete a file",
      description:
        "Removes the object from storage and soft-deletes its database record. A deleted file can no longer be resolved or attached to other resources.",
    }),
    NumericIdParam("id", "File ID to delete"),
    ApiNoContentResponse({ description: "The file was deleted." }),
    ApiNotFoundResponse({
      description: "No active file record exists with this ID.",
      type: ApiErrorResponse,
    }),
  );
