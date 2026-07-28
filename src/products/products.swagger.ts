import { applyDecorators } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
} from "@nestjs/swagger";
import { MessageResponse } from "../auth/responses/index";
import {
  ApiErrorResponse,
  AuthenticationErrors,
  NumericIdParam,
  ProtectedApi,
} from "../swagger/swagger.decorators";
import { CreateProductBody } from "./dto/create-product-body.dto";
import { UpdateProductBody } from "./dto/update-product-body.dto";

export const ControllerDocs = () => ProtectedApi("Products");

const productId = () => NumericIdParam("id", "Product ID");

export const List = () =>
  applyDecorators(
    ApiOperation({
      summary: "Search the product catalog",
      description:
        "Returns non-deleted products. Filter by category or brand ID, and optionally filter dynamic category specs with `specs[field][gte]`, `specs[field][lte]`, or `specs[field][eq]` query values.",
    }),
    ApiQuery({
      name: "category",
      required: false,
      type: Number,
      description: "Only products in this category ID",
    }),
    ApiQuery({
      name: "brand",
      required: false,
      type: Number,
      description: "Only products with this brand ID",
    }),
    ApiQuery({
      name: "specs",
      required: false,
      style: "deepObject",
      explode: true,
      schema: { type: "object", additionalProperties: true },
      description: "Dynamic spec comparisons, for example `specs[ram][gte]=16`",
    }),
    ApiOkResponse({ description: "Matching products.", isArray: true }),
    AuthenticationErrors(),
  );

export const Create = () =>
  applyDecorators(
    ApiConsumes("multipart/form-data"),
    ApiOperation({
      summary: "Create a catalog product",
      description:
        "Creates a product after validating `specs` against its category schema. Optional picture uploads are stored and attached in order; the first becomes the default image when none is set. JSON object fields must be sent as JSON strings in multipart requests.",
    }),
    ApiBody({ type: CreateProductBody }),
    ApiCreatedResponse({ description: "The newly created product." }),
    ApiBadRequestResponse({
      description:
        "The category, specification values, multipart fields, or images are invalid.",
      type: ApiErrorResponse,
    }),
    AuthenticationErrors(),
  );

export const GetById = () =>
  applyDecorators(
    ApiOperation({
      summary: "Get a product with its images",
      description:
        "Returns one active product together with its ordered image records. Soft-deleted products are treated as missing.",
    }),
    productId(),
    ApiOkResponse({ description: "The product and ordered images." }),
    ApiNotFoundResponse({
      description: "The product does not exist or was deleted.",
      type: ApiErrorResponse,
    }),
    AuthenticationErrors(),
  );

export const Update = () =>
  applyDecorators(
    ApiConsumes("multipart/form-data"),
    ApiOperation({
      summary: "Update a catalog product",
      description:
        "Updates supplied product fields and validates changed specs against the effective category. Uploaded pictures are appended after existing images and may become the default image if one is not set.",
    }),
    productId(),
    ApiBody({ type: UpdateProductBody }),
    ApiOkResponse({ description: "The updated product." }),
    ApiBadRequestResponse({
      description: "The category, specs, fields, or images are invalid.",
      type: ApiErrorResponse,
    }),
    ApiNotFoundResponse({
      description: "The product does not exist or was deleted.",
      type: ApiErrorResponse,
    }),
    AuthenticationErrors(),
  );

export const Delete = () =>
  applyDecorators(
    ApiOperation({
      summary: "Delete a product",
      description:
        "Soft-deletes the product so it no longer appears in catalog searches or active lookups.",
    }),
    productId(),
    ApiOkResponse({
      description: "The product was deleted.",
      type: MessageResponse,
    }),
    ApiNotFoundResponse({
      description: "The product does not exist or was already deleted.",
      type: ApiErrorResponse,
    }),
    AuthenticationErrors(),
  );

export const AddImage = () =>
  applyDecorators(
    ApiOperation({
      summary: "Attach an uploaded image to a product",
      description:
        "Attaches an existing ready file to the product as an image, with optional display position and alternative text. Use the file upload flow before calling this endpoint.",
    }),
    productId(),
    ApiCreatedResponse({ description: "The new product-image record." }),
    ApiBadRequestResponse({
      description: "The file is not ready or the request fields are invalid.",
      type: ApiErrorResponse,
    }),
    ApiNotFoundResponse({
      description: "The product or file does not exist.",
      type: ApiErrorResponse,
    }),
    AuthenticationErrors(),
  );

export const ReorderImages = () =>
  applyDecorators(
    ApiOperation({
      summary: "Replace a product's image order",
      description:
        "Sets image positions to match the submitted ID order. Every current image ID must appear exactly in the list, and no image from another product is accepted.",
    }),
    productId(),
    ApiOkResponse({
      description: "All product images in their new order.",
      isArray: true,
    }),
    ApiBadRequestResponse({
      description: "The list is incomplete or contains an unrelated image ID.",
      type: ApiErrorResponse,
    }),
    ApiNotFoundResponse({
      description: "The product does not exist or was deleted.",
      type: ApiErrorResponse,
    }),
    AuthenticationErrors(),
  );
