import { HttpStatus, Injectable } from "@nestjs/common";
import type { AuthenticatedUser } from "../auth/interfaces/index";
import { assertBusinessPermission } from "../auth/permissions";
import { throwHttpError } from "../common/http-error";
import type { CreateShipmentDto } from "./dto/create-shipment.dto";
import type { ListShipmentsQueryDto } from "./dto/list-shipments-query.dto";
import type { RecordShipmentLocationDto } from "./dto/record-shipment-location.dto";
import type { UpdateShipmentDto } from "./dto/update-shipment.dto";
import { ShipmentsRepository } from "./shipments.repository";

const transitions = {
  pending: ["ready_for_pickup", "cancelled"],
  ready_for_pickup: ["in_transit", "delayed", "cancelled"],
  in_transit: ["delayed", "delivered"],
  delayed: ["in_transit", "delivered", "failed", "cancelled"],
  delivered: [],
  failed: [],
  cancelled: [],
} as const;

@Injectable()
export class ShipmentsService {
  constructor(private readonly repository: ShipmentsRepository) {}

  list(
    businessAccountId: number,
    user: AuthenticatedUser,
    query: ListShipmentsQueryDto,
  ) {
    this.assertAccess(user, businessAccountId);
    return this.repository.listForBusiness(businessAccountId, query);
  }

  async get(
    businessAccountId: number,
    shipmentId: number,
    user: AuthenticatedUser,
  ) {
    this.assertAccess(user, businessAccountId);
    const shipment = await this.repository.findForBusiness(
      businessAccountId,
      shipmentId,
    );
    if (!shipment) throwHttpError(HttpStatus.NOT_FOUND, "Shipment not found");
    return shipment;
  }

  async create(
    businessAccountId: number,
    user: AuthenticatedUser,
    dto: CreateShipmentDto,
  ) {
    this.assertAccess(user, businessAccountId);
    const order = await this.repository.findOrderForBusiness(
      businessAccountId,
      dto.orderId,
    );
    if (!order) throwHttpError(HttpStatus.NOT_FOUND, "Order not found");
    if (!["ready_to_ship", "shipped"].includes(order.status)) {
      throwHttpError(
        HttpStatus.CONFLICT,
        "Shipment requires an order ready for dispatch",
      );
    }
    return this.repository.create(businessAccountId, dto, user.id);
  }

  async update(
    businessAccountId: number,
    shipmentId: number,
    user: AuthenticatedUser,
    dto: UpdateShipmentDto,
  ) {
    this.assertAccess(user, businessAccountId);
    return this.repository.transaction(async (tx) => {
      const shipment = await this.repository.findForBusinessForUpdate(
        businessAccountId,
        shipmentId,
        tx,
      );
      if (!shipment) throwHttpError(HttpStatus.NOT_FOUND, "Shipment not found");
      if (dto.status && dto.status !== shipment.status) {
        const allowed = transitions[shipment.status];
        if (!(allowed as readonly string[]).includes(dto.status)) {
          throwHttpError(
            HttpStatus.CONFLICT,
            `Shipment cannot transition from ${shipment.status} to ${dto.status}`,
          );
        }
      }

      if (dto.status === "in_transit" || dto.status === "delivered") {
        const orderStatus =
          dto.status === "in_transit" ? "shipped" : "delivered";
        const order = await this.repository.synchronizeOrderStatus(
          shipment.orderId,
          orderStatus,
          user.id,
          dto.note,
          tx,
        );
        if (!order) {
          throwHttpError(
            HttpStatus.CONFLICT,
            "Shipment status conflicts with the order lifecycle",
          );
        }
      }
      return this.repository.update(shipment.id, dto, tx);
    });
  }

  async recordLocation(
    businessAccountId: number,
    shipmentId: number,
    user: AuthenticatedUser,
    dto: RecordShipmentLocationDto,
  ) {
    this.assertAccess(user, businessAccountId);
    const shipment = await this.repository.findForBusiness(
      businessAccountId,
      shipmentId,
    );
    if (!shipment) throwHttpError(HttpStatus.NOT_FOUND, "Shipment not found");
    if (["delivered", "cancelled"].includes(shipment.status)) {
      throwHttpError(
        HttpStatus.CONFLICT,
        "Closed shipments cannot receive location updates",
      );
    }
    return this.repository.recordLocation(shipment.id, user.id, dto);
  }

  private assertAccess(user: AuthenticatedUser, businessAccountId: number) {
    assertBusinessPermission(user, businessAccountId, "manager.orders.track");
  }
}
