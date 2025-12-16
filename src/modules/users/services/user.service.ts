// src/modules/users/services/user.service.ts

import { eq, count, and } from 'drizzle-orm';
import { db } from '../../../shared/db/index_db';
import { profiles } from '../models/schema';
import { user as userTable } from '../../auth/models/schema';
import { pets } from '../../catalog/models/schema';
import { posts } from '../../community/models/schema';
import { bookings, services } from '../../caretaking/models/schema';

export class UserService {
  /**
   * Get a public profile by ID.
   */
  async getPublicProfile(userId: string) {
    const user = await db.query.user.findFirst({
      where: eq(userTable.id, userId),
      with: {
        profile: true,
      },
      columns: {
        id: true,
        name: true,
        image: true,
        createdAt: true,
      },
    });

    return user || null;
  }

  /**
   * Get the full profile for the currently logged-in user.
   */
  async getCurrentProfile(userId: string) {
    // 1. Fetch User & Profile
    const result = await db
      .select()
      .from(userTable)
      .leftJoin(profiles, eq(profiles.userId, userTable.id))
      .where(eq(userTable.id, userId))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    const row = result[0];

    // 2. Fetch Stats in Parallel
    const [petsSoldRes, postsRes, servicesRes] = await Promise.all([
      db
        .select({ value: count() })
        .from(pets)
        .where(and(eq(pets.ownerId, userId), eq(pets.status, 'sold'))),
      db.select({ value: count() }).from(posts).where(eq(posts.authorId, userId)),
      db
        .select({ value: count() })
        .from(bookings)
        .innerJoin(services, eq(bookings.serviceId, services.id))
        .where(and(eq(services.providerId, userId), eq(bookings.status, 'completed'))),
    ]);

    console.log('Stats Query Results:', { petsSoldRes, postsRes, servicesRes });

    return {
      ...row.user,
      profile: row.profiles,
      stats: {
        petsSold: Number(petsSoldRes[0]?.value) || 0,
        postsCount: Number(postsRes[0]?.value) || 0,
        servicesCompleted: Number(servicesRes[0]?.value) || 0,
      },
    };
  }

  /**
   * Upsert a user profile.
   */
  async updateProfile(
    userId: string,
    data: {
      bio?: string | null;
      phoneNumber?: string | null;
      addressCity?: string | null;
      image?: string | null;
    }
  ) {
    // Upsert Profile
    // Build update object only with defined fields
    const updateSet: any = {};
    if (data.bio !== undefined) {
      updateSet.bio = data.bio;
    }
    if (data.phoneNumber !== undefined) {
      updateSet.phoneNumber = data.phoneNumber;
    }
    if (data.addressCity !== undefined) {
      updateSet.addressCity = data.addressCity;
    }

    let updatedProfile;

    // Base values for insert
    const insertValues = {
      userId: userId,
      bio: data.bio,
      phoneNumber: data.phoneNumber,
      addressCity: data.addressCity,
    };

    if (Object.keys(updateSet).length > 0) {
      [updatedProfile] = await db
        .insert(profiles)
        .values(insertValues)
        .onConflictDoUpdate({
          target: profiles.userId,
          set: updateSet,
        })
        .returning();
    } else {
      // If no fields to update, just ensure it exists or do nothing
      [updatedProfile] = await db
        .insert(profiles)
        .values(insertValues)
        .onConflictDoNothing()
        .returning();

      // If returning() returns empty (because row exists and nothing happened), fetch it?
      // Actually if we only update image, we might not care about the profile object return.
      // But userService typically returns the profile.
      if (!updatedProfile) {
        updatedProfile = await db.query.profiles.findFirst({
          where: eq(profiles.userId, userId),
        });
      }
    }

    // Update User Image if provided
    if (data.image) {
      await db.update(userTable).set({ image: data.image }).where(eq(userTable.id, userId));
    }

    return updatedProfile;
  }
}

export const userService = new UserService();
