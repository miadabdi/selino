import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import { BrandsService } from "./brands.service.js";
import { CreateBrandDto } from "./dto/create-brand.dto.js";
import { UpdateBrandDto } from "./dto/update-brand.dto.js";

@ApiTags("Brands")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("brands")
export class BrandsController {
  constructor(private readonly brandsService: BrandsService) {}

  @Get()
  list() {
    return this.brandsService.list();
  }

  @Post()
  create(@Body() dto: CreateBrandDto) {
    return this.brandsService.create(dto);
  }

  @Patch(":id")
  update(@Param("id", ParseIntPipe) id: number, @Body() dto: UpdateBrandDto) {
    return this.brandsService.update(id, dto);
  }
}
