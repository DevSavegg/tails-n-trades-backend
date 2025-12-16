import { Elysia, t } from 'elysia';
import { userService } from '../services/user.service';
import { isAuthenticated } from '../../auth/lib/guards';
import { storage } from '../../../shared/lib/storage';

const ProfileSchema = t.Object({
  bio: t.Nullable(t.String()),
  phoneNumber: t.Nullable(t.String()),
  addressCity: t.Nullable(t.String()),
  sellerRating: t.Nullable(t.Number()),
  sellerVerified: t.Nullable(t.Boolean()),
});

export const userController = new Elysia({ prefix: '/users' })
  .use(isAuthenticated)
  .get(
    '/me',
    async ({ user, set }) => {
      // const debugUserId = 'eR7tO8sjvchNkNjBIoiI36bALBkWXcJo'; // Hardcoded ID from debug script
      console.log('GET /users/me called. User ID:', user.id);
      const currentUser = await userService.getCurrentProfile(user.id);

      if (!currentUser) {
        set.status = 404;
        return { message: 'User not found' };
      }

      const responseData = {
        id: currentUser.id,
        name: currentUser.name,
        email: currentUser.email,
        image: currentUser.image,
        roles: currentUser.roles || ['customer'],
        profile: currentUser.profile ?? null,
        stats: currentUser.stats,
      };

      console.log('Returning User Data:', JSON.stringify(responseData));

      return responseData;
    },
    {
      detail: {
        summary: 'Get My Profile',
        description: 'Retrieve the currently logged-in user and their profile details.',
        tags: ['Users'],
      },
      response: {
        200: t.Object({
          id: t.String(),
          name: t.String(),
          email: t.String(),
          image: t.Nullable(t.String()),
          roles: t.Array(t.String()),
          profile: t.Nullable(ProfileSchema),
          stats: t.Object({
            petsSold: t.Number(),
            postsCount: t.Number(),
            servicesCompleted: t.Number(),
          }),
        }),
        404: t.Object({ message: t.String(), debugUserId: t.Optional(t.String()) }),
      },
    }
  )
  .patch(
    '/me',
    async ({ user, body, set }) => {
      try {
        let imageUrl: string | undefined;
        if (body.image) {
          console.log('Processing image upload for user:', user.id);
          // Elysia validates t.File, so body.image should be a Blob/File
          imageUrl = await storage.saveFile(body.image as any, 'profiles');
          console.log('Image saved at:', imageUrl);
        }

        const result = await userService.updateProfile(user.id, {
          ...body,
          image: imageUrl,
        });

        return { success: true, ...result, newImage: imageUrl };
      } catch (err: any) {
        console.error('Error in PATCH /users/me:', err);
        set.status = 500;
        return { error: err.message, stack: err.stack };
      }
    },
    {
      body: t.Object({
        bio: t.Optional(t.String()),
        phoneNumber: t.Optional(t.String()),
        addressCity: t.Optional(t.String()),
        image: t.Optional(t.Any()), // Relaxed for FormData
      }),
      detail: {
        summary: 'Update Profile',
        description: 'Update user profile details.',
        tags: ['Users'],
      },
    }
  )

  // GET /users/:id
  .get(
    '/:id',
    async ({ params, set }) => {
      const publicUser = await userService.getPublicProfile(params.id);

      if (!publicUser) {
        set.status = 404;
        return { message: 'User not found' };
      }

      return publicUser;
    },
    {
      params: t.Object({ id: t.String() }),
      detail: {
        summary: 'Get Public Profile',
        description: 'Get public details of a specific user.',
        tags: ['Users'],
      },
      response: {
        200: t.Object({
          id: t.String(),
          name: t.String(),
          image: t.Nullable(t.String()),
          createdAt: t.Date(),
          profile: t.Nullable(ProfileSchema),
        }),
        404: t.Object({ message: t.String() }),
      },
    }
  );
