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
import { UploadIntentDto } from "./dto/index";
import { FilesService } from "./files.service";
import { FileResponse, UploadIntentResponse } from "./responses/index";
import * as Swagger from "./files.swagger";

@Swagger.ControllerDocs()
@Controller("files")
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post("upload-intent")
  @HttpCode(HttpStatus.CREATED)
  @Swagger.CreateUploadIntent()
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

  @Post(":id/confirm")
  @HttpCode(HttpStatus.OK)
  @Swagger.ConfirmUpload()
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

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @Swagger.DeleteFile()
  async deleteFile(@Param("id", ParseIntPipe) id: number): Promise<void> {
    await this.filesService.softDelete(id);
  }
}
