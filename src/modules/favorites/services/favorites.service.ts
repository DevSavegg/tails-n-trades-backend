import { and, eq, sql } from 'drizzle-orm';
import { db } from '../../../shared/db/index_db';
import { favorites } from '../models/schema';
import { pets, petImages } from '../../catalog/models/schema';

export const favoritesService = {
  // Toggle favorite: returns true if added, false if removed
  async toggleFavorite(userId: string, petId: number) {
    const existing = await db
      .select()
      .from(favorites)
      .where(and(eq(favorites.userId, userId), eq(favorites.petId, petId)))
      .limit(1);

    if (existing.length > 0) {
      // Remove
      await db
        .delete(favorites)
        .where(and(eq(favorites.userId, userId), eq(favorites.petId, petId)));
      return false; // Removed
    } else {
      // Add
      await db.insert(favorites).values({ userId, petId });
      return true; // Added
    }
  },

  // Check if favorite exists
  async isFavorite(userId: string, petId: number) {
    const existing = await db
      .select()
      .from(favorites)
      .where(and(eq(favorites.userId, userId), eq(favorites.petId, petId)))
      .limit(1);
    return existing.length > 0;
  },

  // Get user's favorites with pagination
  async getFavorites(userId: string, page = 1, limit = 10) {
    const offset = (page - 1) * limit;

    // Fetch favorites joined with pets
    const data = await db
      .select({
        favoriteAt: favorites.createdAt,
        pet: pets,
        // We can try to fetch primary image if we join images, or execute separate query
        // Let's keep it simple and join pet data first
      })
      .from(favorites)
      .innerJoin(pets, eq(favorites.petId, pets.id))
      .where(eq(favorites.userId, userId))
      .limit(limit)
      .offset(offset)
      .orderBy(favorites.createdAt); // Newest favorites last? Or first? usually desc

    // Fetch images for these pets manually or via another join.
    // Similar to catalog service logic.
    const petIds = data.map((d) => d.pet.id);
    const imagesMap: Record<number, string[]> = {};

    if (petIds.length > 0) {
      const images = await db
        .select()
        .from(petImages)
        .where(sql`${petImages.petId} IN ${petIds}`);

      images.forEach((img) => {
        if (!imagesMap[img.petId]) {
          imagesMap[img.petId] = [];
        }
        imagesMap[img.petId].push(img.url);
      });
    }

    const formatted = data.map((item) => ({
      ...item.pet,
      favoritedAt: item.favoriteAt,
      images: imagesMap[item.pet.id] || [],
    }));

    // Count total
    const totalRes = await db
      .select({ count: sql<number>`count(*)` })
      .from(favorites)
      .where(eq(favorites.userId, userId));

    const total = Number(totalRes[0]?.count || 0);

    return {
      data: formatted,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  },
};
