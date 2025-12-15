// src/modules/users/services/user.service.ts

import { eq } from 'drizzle-orm';
import { db } from '../../../shared/db/index_db';
import { profiles } from '../models/schema';
import { user as userTable } from '../../auth/models/schema';

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
    const user = await db.query.user.findFirst({
      where: eq(userTable.id, userId),
      with: {
        profile: true,
      },
    });

    return user || null;
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
    }
  ) {
    const [updatedProfile] = await db
      .insert(profiles)
      .values({
        userId: userId,
        bio: data.bio,
        phoneNumber: data.phoneNumber,
        addressCity: data.addressCity,
      })
      .onConflictDoUpdate({
        target: profiles.userId,
        set: { bio: data.bio, phoneNumber: data.phoneNumber, addressCity: data.addressCity },
      })
      .returning();

    return updatedProfile;
  }
}

export const userService = new UserService();
