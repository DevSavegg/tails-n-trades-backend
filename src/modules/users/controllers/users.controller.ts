import { Elysia, t } from 'elysia';
import { userService } from '../services/user.service';
import { isAuthenticated } from '../../auth/lib/guards';

const ProfileSchema = t.Object({
  bio: t.Nullable(t.String()),
  phoneNumber: t.Nullable(t.String()),
  addressCity: t.Nullable(t.String()),
  sellerRating: t.Nullable(t.Number()),
  sellerVerified: t.Nullable(t.Boolean()),
});

export const userController = new Elysia({ prefix: '/users' }).guard(
  {
    detail: { tags: ['Users'] },
  },
  (app) =>
    app
      .group('/me', (app) =>
        app
          .use(isAuthenticated)

          // GET /users/me
          .get(
            '/',
            async ({ user, set }) => {
              const currentUser = await userService.getCurrentProfile(user.id);

              if (!currentUser) {
                set.status = 404;
                return { message: 'User not found' };
              }

              return {
                id: currentUser.id,
                name: currentUser.name,
                email: currentUser.email,
                image: currentUser.image,
                profile: currentUser.profile ?? null,
              };
            },
            {
              detail: {
                summary: 'Get My Profile',
                description: 'Retrieve the currently logged-in user and their profile details.',
              },
              response: {
                200: t.Object({
                  id: t.String(),
                  name: t.String(),
                  email: t.String(),
                  image: t.Nullable(t.String()),
                  profile: t.Nullable(ProfileSchema),
                }),
                404: t.Object({ message: t.String() }),
              },
            }
          )

          // PATCH /users/me
          .patch(
            '/',
            async ({ user, body }) => {
              return await userService.updateProfile(user.id, body);
            },
            {
              body: t.Object({
                bio: t.Optional(t.String()),
                phoneNumber: t.Optional(t.String()),
                addressCity: t.Optional(t.String()),
              }),
              detail: {
                summary: 'Update Profile',
                description: 'Update user profile details.',
              },
            }
          )
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
      )
);
