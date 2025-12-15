// src/modules/catalog/services/catalog.service.ts

import { eq, and, desc, sql, ilike, gte, lte } from 'drizzle-orm';
import { db } from '../../../shared/db/index_db';
import { pets, petImages, petTypeEnum } from '../models/schema';

type PetType = (typeof petTypeEnum.enumValues)[number];
type CreatePetDTO = typeof pets.$inferInsert & { images?: string[] };
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
  }) {
    const conditions = [eq(pets.status, 'available')];

    if (filters.type) {
      conditions.push(eq(pets.type, filters.type as PetType));
    }

    if (filters.minPrice) {
      conditions.push(gte(pets.priceCents, filters.minPrice));
    }

    if (filters.maxPrice) {
      conditions.push(lte(pets.priceCents, filters.maxPrice));
    }

    if (filters.keyword) {
      conditions.push(ilike(pets.name, `%${filters.keyword}%`));
    }

    if (filters.breed) {
      conditions.push(sql`${pets.attributes}->>'breed' ILIKE ${`%${filters.breed}%`}`);
    }

    return await db.query.pets.findMany({
      where: and(...conditions),
      with: {
        images: true,
        owner: {
          columns: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
      orderBy: [desc(pets.createdAt)],
    });
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
          status: 'available',
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
