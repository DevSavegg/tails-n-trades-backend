// src/modules/sales/services/sales.service.ts

import { eq, inArray } from 'drizzle-orm';
import { db } from '../../../shared/db/index_db';
import { orders, orderItems, orderStatusEnum } from '../models/schema';
import { pets } from '../../catalog/models/schema';

export class SalesService {
  /**
   * Create a new order.
   */
  async createOrder(buyerId: string, petIds: number[]) {
    return await db.transaction(async (tx) => {
      const petsToBuy = await tx.query.pets.findMany({
        where: inArray(pets.id, petIds),
      });

      if (petsToBuy.length !== petIds.length) {
        throw new Error('One or more pets not found');
      }

      const unavailablePets = petsToBuy.filter((p) => p.status !== 'available');
      if (unavailablePets.length > 0) {
        throw new Error(
          `The following pets are no longer available: ${unavailablePets.map((p) => p.name).join(', ')}`
        );
      }

      const totalCents = petsToBuy.reduce((sum, pet) => sum + pet.priceCents, 0);

      const [newOrder] = await tx
        .insert(orders)
        .values({
          buyerId,
          totalAmountCents: totalCents,
          status: 'pending_payment',
        })
        .returning();

      await tx.insert(orderItems).values(
        petsToBuy.map((pet) => ({
          orderId: newOrder.id,
          petId: pet.id,
          priceAtPurchaseCents: pet.priceCents,
        }))
      );

      await tx
        .update(pets)
        .set({ status: 'pending', updatedAt: new Date() })
        .where(inArray(pets.id, petIds));

      return newOrder;
    });
  }

  /**
   * Get details of a specific order
   */
  async getOrderById(orderId: number, userId: string) {
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
      with: {
        items: {
          with: {
            pet: true,
          },
        },
        buyer: {
          columns: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!order) {
      return null;
    }

    if (order.buyerId !== userId) {
      throw new Error('Unauthorized access to order');
    }

    return order;
  }

  /**
   * Update Order Status
   */
  async updateOrderStatus(
    orderId: number,
    status: (typeof orderStatusEnum.enumValues)[number],
    stripePaymentId?: string
  ) {
    return await db.transaction(async (tx) => {
      const [updatedOrder] = await tx
        .update(orders)
        .set({
          status,
          stripePaymentId: stripePaymentId || undefined,
          updatedAt: new Date(),
        })
        .where(eq(orders.id, orderId))
        .returning();

      if (status === 'paid') {
        const items = await tx.query.orderItems.findMany({
          where: eq(orderItems.orderId, orderId),
        });
        const petIds = items.map((i) => i.petId);

        await tx.update(pets).set({ status: 'sold' }).where(inArray(pets.id, petIds));
      }

      if (status === 'cancelled' || status === 'refunded') {
        const items = await tx.query.orderItems.findMany({
          where: eq(orderItems.orderId, orderId),
        });
        const petIds = items.map((i) => i.petId);

        await tx.update(pets).set({ status: 'available' }).where(inArray(pets.id, petIds));
      }

      return updatedOrder;
    });
  }
}

export const salesService = new SalesService();
