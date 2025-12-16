import { Elysia, t } from 'elysia';
import { favoritesService } from '../services/favorites.service';
import { isAuthenticated } from '../../auth/lib/guards';

export const favoritesController = new Elysia({ prefix: '/favorites' })
  .use(isAuthenticated) // All favorites routes require auth
  .guard(
    {
      detail: { tags: ['Favorites'] },
    },
    (app) =>
      app
        // Check Status
        .get(
          '/check/:petId',
          async ({ user, params }) => {
            const isFav = await favoritesService.isFavorite(user.id, params.petId);
            return { isFavorite: isFav };
          },
          {
            params: t.Object({
              petId: t.Numeric(),
            }),
          }
        )

        // Toggle Favorite
        .post(
          '/toggle',
          async ({ user, body }) => {
            const isFavorited = await favoritesService.toggleFavorite(user.id, body.petId);
            return { isFavorited };
          },
          {
            body: t.Object({
              petId: t.Numeric(),
            }),
          }
        )

        // List Favorites
        .get(
          '/',
          async ({ user, query }) => {
            return await favoritesService.getFavorites(user.id, query.page, query.limit);
          },
          {
            query: t.Object({
              page: t.Optional(t.Numeric({ default: 1 })),
              limit: t.Optional(t.Numeric({ default: 10, maximum: 50 })),
            }),
          }
        )
  );
