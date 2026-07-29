import { Inject, Injectable } from "@nestjs/common";
import { and, desc, eq, or, sql } from "drizzle-orm";
import { AbstractRepository } from "../common/abstract.repository";
import { DATABASE } from "../database/database.constants";
import type { Database, TXContext } from "../database/database.types";
import {
  orders,
  orderStatusEvents,
  shipmentLocationEvents,
  shipments,
} from "../database/schema/index";
import type { CreateShipmentDto } from "./dto/create-shipment.dto";
import type { ListShipmentsQueryDto } from "./dto/list-shipments-query.dto";
import type { RecordShipmentLocationDto } from "./dto/record-shipment-location.dto";
import type { UpdateShipmentDto } from "./dto/update-shipment.dto";

@Injectable()
export class ShipmentsRepository extends AbstractRepository {
  constructor(@Inject(DATABASE) db: Database) {
    super(db);
  }

  findOrderForBusiness(
    businessAccountId: number,
    orderId: number,
    txContext: TXContext = this.db,
  ) {
    return txContext.query.orders.findFirst({
      where: (table) =>
        and(
          eq(table.id, orderId),
          or(
            eq(table.buyerBusinessAccountId, businessAccountId),
            eq(table.supplierBusinessAccountId, businessAccountId),
          ),
        ),
    });
  }

  findByOrderId(orderId: number, txContext: TXContext = this.db) {
    return txContext.query.shipments.findFirst({
      where: (table) => eq(table.orderId, orderId),
    });
  }

  async create(
    businessAccountId: number,
    dto: CreateShipmentDto,
    actorId: number,
    txContext: TXContext = this.db,
  ) {
    const [shipment] = await txContext
      .insert(shipments)
      .values({
        orderId: dto.orderId,
        carrier: dto.carrier,
        trackingNumber: dto.trackingCode,
        estimatedDeliveryAt: dto.estimatedDeliveryAt
          ? new Date(dto.estimatedDeliveryAt)
          : null,
        status: "pending",
        createdBy: actorId,
      })
      .onConflictDoNothing()
      .returning();
    return shipment ?? this.findByOrderId(dto.orderId, txContext);
  }

  async listForBusiness(
    businessAccountId: number,
    query: ListShipmentsQueryDto,
    txContext: TXContext = this.db,
  ) {
    const conditions = [
      sql`exists (
        select 1 from ${orders}
        where ${orders.id} = ${shipments.orderId}
          and (
            ${orders.buyerBusinessAccountId} = ${businessAccountId}
            or ${orders.supplierBusinessAccountId} = ${businessAccountId}
          )
      )`,
    ];
    if (query.status) conditions.push(eq(shipments.status, query.status));
    if (query.orderId) conditions.push(eq(shipments.orderId, query.orderId));
    const where = and(...conditions);
    const offset = (query.page - 1) * query.limit;
    const [items, countRows] = await Promise.all([
      txContext.query.shipments.findMany({
        where,
        orderBy: (table) => [desc(table.createdAt), desc(table.id)],
        limit: query.limit,
        offset,
      }),
      txContext
        .select({ total: sql<number>`count(*)::int` })
        .from(shipments)
        .where(where),
    ]);
    return {
      items,
      page: query.page,
      limit: query.limit,
      total: countRows[0]?.total ?? 0,
    };
  }

  async findForBusiness(
    businessAccountId: number,
    shipmentId: number,
    txContext: TXContext = this.db,
  ) {
    const shipment = await txContext.query.shipments.findFirst({
      where: (table) =>
        and(
          eq(table.id, shipmentId),
          sql`exists (
            select 1 from ${orders}
            where ${orders.id} = ${table.orderId}
              and (
                ${orders.buyerBusinessAccountId} = ${businessAccountId}
                or ${orders.supplierBusinessAccountId} = ${businessAccountId}
              )
          )`,
        ),
    });
    if (!shipment) return undefined;
    const locations = await txContext.query.shipmentLocationEvents.findMany({
      where: (table) => eq(table.shipmentId, shipment.id),
      orderBy: (table) => [desc(table.recordedAt), desc(table.id)],
    });
    return { ...shipment, locations };
  }

  async findForBusinessForUpdate(
    businessAccountId: number,
    shipmentId: number,
    txContext: TXContext,
  ) {
    const [shipment] = await txContext
      .select()
      .from(shipments)
      .where(
        and(
          eq(shipments.id, shipmentId),
          sql`exists (
            select 1 from ${orders}
            where ${orders.id} = ${shipments.orderId}
              and (
                ${orders.buyerBusinessAccountId} = ${businessAccountId}
                or ${orders.supplierBusinessAccountId} = ${businessAccountId}
              )
          )`,
        ),
      )
      .for("update");
    return shipment;
  }

  async update(
    shipmentId: number,
    dto: UpdateShipmentDto,
    txContext: TXContext,
  ) {
    const [shipment] = await txContext
      .update(shipments)
      .set({
        status: dto.status,
        carrier: dto.carrier,
        trackingNumber: dto.trackingCode,
        estimatedDeliveryAt: dto.estimatedDeliveryAt
          ? new Date(dto.estimatedDeliveryAt)
          : undefined,
        pickedUpAt: dto.status === "in_transit" ? new Date() : undefined,
        deliveredAt: dto.status === "delivered" ? new Date() : undefined,
        delayedAt: dto.status === "delayed" ? new Date() : undefined,
        delayReason: dto.status === "delayed" ? dto.note : undefined,
        notes: dto.note,
        updatedAt: new Date(),
      })
      .where(eq(shipments.id, shipmentId))
      .returning();
    return shipment;
  }

  async synchronizeOrderStatus(
    orderId: number,
    targetStatus: "shipped" | "delivered",
    actorId: number,
    note: string | undefined,
    txContext: TXContext,
  ) {
    const [order] = await txContext
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .for("update");
    if (!order || order.status === targetStatus) return order;
    const allowed =
      (targetStatus === "shipped" && order.status === "ready_to_ship") ||
      (targetStatus === "delivered" && order.status === "shipped");
    if (!allowed) return undefined;

    const [updated] = await txContext
      .update(orders)
      .set({
        status: targetStatus,
        completedAt: targetStatus === "delivered" ? new Date() : undefined,
        updatedAt: new Date(),
      })
      .where(and(eq(orders.id, orderId), eq(orders.status, order.status)))
      .returning();
    if (updated) {
      await txContext.insert(orderStatusEvents).values({
        orderId,
        previousStatus: order.status,
        status: targetStatus,
        changedBy: actorId,
        reason: note,
      });
    }
    return updated;
  }

  async recordLocation(
    shipmentId: number,
    actorId: number,
    dto: RecordShipmentLocationDto,
    txContext: TXContext = this.db,
  ) {
    const [location] = await txContext
      .insert(shipmentLocationEvents)
      .values({
        shipmentId,
        latitude: dto.latitude,
        longitude: dto.longitude,
        accuracyMeters: dto.accuracyMeters,
        recordedAt: dto.recordedAt ? new Date(dto.recordedAt) : new Date(),
        metadata: dto.note ? { note: dto.note } : undefined,
        recordedBy: actorId,
      })
      .returning();
    await txContext
      .update(shipments)
      .set({
        currentLatitude: dto.latitude,
        currentLongitude: dto.longitude,
        lastLocationAt: dto.recordedAt ? new Date(dto.recordedAt) : new Date(),
        updatedAt: new Date(),
      })
      .where(eq(shipments.id, shipmentId));
    return location;
  }
}
