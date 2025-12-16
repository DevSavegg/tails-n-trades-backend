import { eq, and, desc, sql, ilike, gte, lte, inArray } from 'drizzle-orm';
import { db } from '../../../shared/db/index_db';
import { pets, petImages, petTypeEnum, petStatusEnum } from '../models/schema';
import { profiles } from '../../users/models/schema';
import { user } from '../../auth/models/schema';

type PetType = (typeof petTypeEnum.enumValues)[number];
type PetStatus = (typeof petStatusEnum.enumValues)[number];

type CreatePetDTO = typeof pets.$inferInsert & { images?: string[]; status?: string };
type UpdatePetDTO = Partial<typeof pets.$inferInsert> & { images?: string[] };

export class CatalogService {
  /**
   * Search pets with filters
   */
  async findAll(filters: {
    type?: string;
    minPrice?: number;
    maxPrice?: number;
    keyword?: string;
    breed?: string;
    location?: string;
    page?: number;
    limit?: number;
    ownerId?: string;
    status?: string;
  }) {
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const offset = (page - 1) * limit;

    // 1. Build Search Query (Select IDs)
    const baseQuery = db
      .select({ id: pets.id })
      .from(pets)
      .leftJoin(user, eq(pets.ownerId, user.id))
      .leftJoin(profiles, eq(user.id, profiles.userId))
      .where(
        and(
          // Logic:
          // If ownerId is provided (even empty string), we STRICTLY filter by it.
          // If ownerId is UNDEFINED, we default to Public Mode (status='available' only).

          // 1. Owner Filter
          filters.ownerId !== undefined ? eq(pets.ownerId, filters.ownerId) : undefined,

          // 2. Status Filter
          // If Owner specified: Allow any status if requested (default to all if not?).
          // Actually, if Owner specified:
          //    If status filter provided -> use it.
          //    If NO status filter -> show all (for My Pets dashboard).
          // If Owner NOT specified (Public):
          //    Force status = 'available'.
          filters.ownerId !== undefined
            ? filters.status
              ? eq(pets.status, filters.status as PetStatus)
              : undefined
            : eq(pets.status, 'available'),

          filters.type ? eq(pets.type, filters.type as PetType) : undefined,
          filters.minPrice ? gte(pets.priceCents, filters.minPrice) : undefined,
          filters.maxPrice ? lte(pets.priceCents, filters.maxPrice) : undefined,
          filters.keyword ? ilike(pets.name, `%${filters.keyword}%`) : undefined,
          filters.location ? ilike(profiles.addressCity, `%${filters.location}%`) : undefined,
          filters.breed
            ? sql`${pets.attributes}->>'breed' ILIKE ${`%${filters.breed}%`}`
            : undefined
        )
      );

    // 2. Get Total Count
    // Create a separate count query based on the same conditions
    const countQuery = db
      .select({ count: sql<number>`count(*)` })
      .from(pets)
      .leftJoin(user, eq(pets.ownerId, user.id))
      .leftJoin(profiles, eq(user.id, profiles.userId))
      .where(
        and(
          filters.ownerId !== undefined ? eq(pets.ownerId, filters.ownerId) : undefined,

          filters.ownerId !== undefined
            ? filters.status
              ? eq(pets.status, filters.status as PetStatus)
              : undefined
            : eq(pets.status, 'available'),

          filters.type ? eq(pets.type, filters.type as PetType) : undefined,
          filters.minPrice ? gte(pets.priceCents, filters.minPrice) : undefined,
          filters.maxPrice ? lte(pets.priceCents, filters.maxPrice) : undefined,
          filters.keyword ? ilike(pets.name, `%${filters.keyword}%`) : undefined,
          filters.location ? ilike(profiles.addressCity, `%${filters.location}%`) : undefined,
          filters.breed
            ? sql`${pets.attributes}->>'breed' ILIKE ${`%${filters.breed}%`}`
            : undefined
        )
      );

    const totalRes = await countQuery;
    const total = Number(totalRes[0]?.count || 0);

    // 3. Get Paged IDs
    const pagedIdsRes = await baseQuery.limit(limit).offset(offset).orderBy(desc(pets.createdAt));

    const pagedIds = pagedIdsRes.map((p) => p.id);

    if (pagedIds.length === 0) {
      return { data: [], total };
    }

    // 4. Fetch Details
    const data = await db.query.pets.findMany({
      where: inArray(pets.id, pagedIds),
      with: {
        images: true,
        owner: {
          columns: {
            id: true,
            name: true,
            image: true,
          },
          with: {
            profile: {
              columns: {
                addressCity: true,
              },
            },
          },
        },
      },
      orderBy: [desc(pets.createdAt)],
    });

    return { data, total };
  }

  async findById(id: number) {
    return await db.query.pets.findFirst({
      where: eq(pets.id, id),
      with: {
        images: true,
        owner: {
          columns: {
            id: true,
            name: true,
            image: true,
            email: true,
          },
          with: {
            profile: {
              columns: {
                addressCity: true,
                phoneNumber: true,
              },
            },
          },
        },
      },
    });
  }

  async createPet(ownerId: string, data: CreatePetDTO) {
    return await db.transaction(async (tx) => {
      const [newPet] = await tx
        .insert(pets)
        .values({
          ...data,
          ownerId,
          status: data.status || 'available',
        })
        .returning();

      if (data.images && data.images.length > 0) {
        await tx.insert(petImages).values(
          data.images.map((url, idx) => ({
            petId: newPet.id,
            url: url,
            isPrimary: idx === 0,
          }))
        );
      }

      return newPet;
    });
  }

  async updatePet(petId: number, ownerId: string, data: UpdatePetDTO) {
    const existing = await this.findById(petId);
    if (!existing || existing.ownerId !== ownerId) {
      throw new Error('Unauthorized or Pet not found');
    }

    const { images, ...petData } = data;

    const [updated] = await db
      .update(pets)
      .set({ ...petData, updatedAt: new Date() })
      .where(eq(pets.id, petId))
      .returning();

    if (images) {
      await db.delete(petImages).where(eq(petImages.petId, petId));
      if (images.length > 0) {
        await db.insert(petImages).values(
          images.map((url, idx) => ({
            petId: petId,
            url: url,
            isPrimary: idx === 0,
          }))
        );
      }
    }

    return updated;
  }

  async deletePet(petId: number, ownerId: string) {
    const existing = await this.findById(petId);
    if (!existing || existing.ownerId !== ownerId) {
      throw new Error('Unauthorized or Pet not found');
    }

    await db.delete(petImages).where(eq(petImages.petId, petId));
    await db.delete(pets).where(eq(pets.id, petId));

    return { success: true };
  }
}

export const catalogService = new CatalogService();
