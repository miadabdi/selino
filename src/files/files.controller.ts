import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
} from "@nestjs/common";
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { UploadIntentDto } from "./dto/index.js";
import { FilesService } from "./files.service.js";
import { FileResponse, UploadIntentResponse } from "./responses/index.js";

@ApiTags("Files")
@Controller("files")
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  /**
   * POST /files/upload-intent
   * Request a presigned upload URL for a file.
   */
  @Post("upload-intent")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Create an upload intent with presigned URL" })
  @ApiBody({ type: UploadIntentDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: "Upload intent created, presigned URL returned",
    type: UploadIntentResponse,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: "Invalid mimetype or file size for the specified bucket",
  })
  async createUploadIntent(
    @Body() dto: UploadIntentDto,
  ): Promise<UploadIntentResponse> {
    return this.filesService.createUploadIntent(
      dto.bucketKey,
      dto.filename,
      dto.mimetype,
      dto.sizeInBytes,
    );
  }

  /**
   * POST /files/:id/confirm
   * Confirm that a file has been uploaded to storage.
   */
  @Post(":id/confirm")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Confirm a file upload" })
  @ApiParam({ name: "id", type: Number, description: "File ID" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "File confirmed as ready",
    type: FileResponse,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "File not found",
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: "File not found in storage or invalid status",
  })
  async confirmUpload(
    @Param("id", ParseIntPipe) id: number,
  ): Promise<FileResponse> {
    const file = await this.filesService.confirmUpload(id);
    const url = await this.filesService.resolveUrl(id);

    return {
      id: file.id,
      filename: file.filename,
      mimetype: file.mimetype,
      sizeInBytes: file.sizeInBytes,
      status: file.status,
      isPublic: file.isPublic,
      url,
      createdAt: file.createdAt,
    };
  }

  /**
   * DELETE /files/:id
   * Soft-delete a file (removes from storage and marks deleted in DB).
   */
  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Soft-delete a file" })
  @ApiParam({ name: "id", type: Number, description: "File ID" })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: "File deleted successfully",
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "File not found",
  })
  async deleteFile(@Param("id", ParseIntPipe) id: number): Promise<void> {
    await this.filesService.softDelete(id);
  }
}
