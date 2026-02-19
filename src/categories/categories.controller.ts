import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import { CategoriesService } from "./categories.service.js";
import { CreateCategoryDto } from "./dto/create-category.dto.js";
import { ReplaceSpecSchemaDto } from "./dto/replace-spec-schema.dto.js";
import { UpdateCategoryDto } from "./dto/update-category.dto.js";

@ApiTags("Categories")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("categories")
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  list() {
    return this.categoriesService.listHierarchy();
  }

  @Post()
  create(@Body() dto: CreateCategoryDto) {
    return this.categoriesService.create(dto);
  }

  @Patch(":id")
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.categoriesService.update(id, dto);
  }

  @Get(":id/spec-schema")
  getSpecSchema(@Param("id", ParseIntPipe) id: number) {
    return this.categoriesService.getSpecSchema(id);
  }

  @Put(":id/spec-schema")
  replaceSpecSchema(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: ReplaceSpecSchemaDto,
  ) {
    return this.categoriesService.replaceSpecSchema(id, dto);
  }
}
