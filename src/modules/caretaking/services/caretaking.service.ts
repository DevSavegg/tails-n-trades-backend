// src/modules/caretaking/services/caretaking.service.ts

import { eq, and, desc, gte, lte, ilike } from 'drizzle-orm';
import { db } from '../../../shared/db/index_db';
import { services, bookings, logs, serviceTypeEnum, bookingStatusEnum } from '../models/schema';
import { pets } from '../../catalog/models/schema';
import { profiles } from '../../users/models/schema';
import { user as userTable } from '../../auth/models/schema';

export class CaretakingService {
  // --- Service Management ---

  async createService(providerId: string, data: typeof services.$inferInsert) {
    const [newService] = await db
      .insert(services)
      .values({
        ...data,
        providerId,
        isActive: true,
      })
      .returning();
    return newService;
  }

  async getServices(filters: { type?: string; city?: string; providerId?: string }) {
    // simplified query using relations
    let results = await db.query.services.findMany({
      where: (services, { eq, and }) => {
        const conditions = [eq(services.isActive, true)];
        if (filters.type) {
          conditions.push(eq(services.type, filters.type as any));
        }
        if (filters.providerId) {
          conditions.push(eq(services.providerId, filters.providerId));
        }
        return and(...conditions);
      },
      with: {
        provider: {
          columns: { id: true, name: true, image: true },
          with: {
            profile: true,
          },
        },
      },
    });

    // In-memory filtering for city if needed (Relation queries don't easily support deep where filtering)
    if (filters.city) {
      const cityLower = filters.city.toLowerCase();
      results = results.filter((r) =>
        r.provider?.profile?.addressCity?.toLowerCase().includes(cityLower)
      );
    }

    return results.map((row) => ({
      ...row,
      provider: row.provider,
      location: row.provider?.profile?.addressCity || 'Unknown Location',
    }));
  }

  // --- Service Updates ---

  async updateService(
    serviceId: number,
    providerId: string,
    data: Partial<typeof services.$inferInsert>
  ) {
    // Verify ownership
    const service = await db.query.services.findFirst({
      where: eq(services.id, serviceId),
    });

    if (!service || service.providerId !== providerId) {
      throw new Error('Unauthorized or Service not found');
    }

    const [updated] = await db
      .update(services)
      .set(data)
      .where(eq(services.id, serviceId))
      .returning();

    return updated;
  }

  async deleteService(serviceId: number, providerId: string) {
    // Verify ownership
    const service = await db.query.services.findFirst({
      where: eq(services.id, serviceId),
    });

    if (!service || service.providerId !== providerId) {
      throw new Error('Unauthorized or Service not found');
    }

    // Soft delete (set isActive = false)
    const [updated] = await db
      .update(services)
      .set({ isActive: false })
      .where(eq(services.id, serviceId))
      .returning();

    return updated;
  }

  // --- Booking Logic ---

  async createBooking(
    customerId: string,
    data: {
      serviceId: number;
      petId: number;
      startDate: Date;
      endDate: Date;
    }
  ) {
    // Validate Service Exists
    const service = await db.query.services.findFirst({
      where: eq(services.id, data.serviceId),
    });
    if (!service || !service.isActive) {
      throw new Error('Service not available');
    }

    // Validate Pet Ownership
    const pet = await db.query.pets.findFirst({
      where: eq(pets.id, data.petId),
    });
    if (!pet || pet.ownerId !== customerId) {
      throw new Error('Invalid pet');
    }

    // Calculate Price (Simple Per Day Logic)
    const days = Math.max(
      1,
      Math.ceil((data.endDate.getTime() - data.startDate.getTime()) / (1000 * 60 * 60 * 24))
    );
    const totalPrice = service.basePriceCents * days;

    // Create Booking
    const [booking] = await db
      .insert(bookings)
      .values({
        customerId,
        serviceId: data.serviceId,
        petId: data.petId,
        startDate: data.startDate,
        endDate: data.endDate,
        totalPriceCents: totalPrice,
        status: 'pending',
      })
      .returning();

    return booking;
  }

  async getMyBookings(userId: string, role: 'customer' | 'provider') {
    const whereClause = role === 'customer' ? eq(bookings.customerId, userId) : undefined;

    if (role === 'provider') {
      const myServices = await db.query.services.findMany({
        where: eq(services.providerId, userId),
        columns: { id: true },
      });
      const serviceIds = myServices.map((s) => s.id);

      if (serviceIds.length === 0) {
        return [];
      }

      return await db.query.bookings.findMany({
        with: {
          service: true,
          pet: true,
          customer: { columns: { id: true, name: true } },
        },
        where: (bookings, { inArray }) => inArray(bookings.serviceId, serviceIds),
        orderBy: [desc(bookings.createdAt)],
      });
    }

    return await db.query.bookings.findMany({
      where: whereClause,
      with: {
        service: { with: { provider: { columns: { name: true } } } },
        pet: true,
      },
      orderBy: [desc(bookings.createdAt)],
    });
  }

  // --- Status Updates & Logs ---

  async updateBookingStatus(
    bookingId: number,
    providerId: string,
    status: (typeof bookingStatusEnum.enumValues)[number]
  ) {
    const booking = await db.query.bookings.findFirst({
      where: eq(bookings.id, bookingId),
      with: { service: true },
    });

    if (!booking || booking.service.providerId !== providerId) {
      throw new Error('Unauthorized');
    }

    const [updated] = await db
      .update(bookings)
      .set({ status })
      .where(eq(bookings.id, bookingId))
      .returning();

    return updated;
  }

  async addLog(
    providerId: string,
    bookingId: number,
    data: { title: string; description?: string; imageUrl?: string }
  ) {
    const booking = await db.query.bookings.findFirst({
      where: eq(bookings.id, bookingId),
      with: { service: true },
    });

    if (!booking || booking.service.providerId !== providerId) {
      throw new Error('Unauthorized');
    }

    const [log] = await db
      .insert(logs)
      .values({
        bookingId,
        authorId: providerId,
        title: data.title,
        description: data.description,
        imageUrl: data.imageUrl,
        meta: {},
      })
      .returning();

    return log;
  }

  async getBookingLogs(bookingId: number) {
    return await db.query.logs.findMany({
      where: eq(logs.bookingId, bookingId),
      orderBy: [desc(logs.loggedAt)],
    });
  }
}

export const caretakingService = new CaretakingService();
