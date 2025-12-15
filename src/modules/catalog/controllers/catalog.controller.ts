// src/modules/catalog/controllers/catalog.controller.ts

import { Elysia, t } from 'elysia';
import { catalogService } from '../services/catalog.service';
import { isAuthenticated } from '../../auth/lib/guards';
import { petTypeEnum, petStatusEnum } from '../models/schema';

// --- Helpers ---
const toElysiaEnum = (drizzleEnum: { enumValues: string[] }) => {
  return drizzleEnum.enumValues.reduce((acc, curr) => ({ ...acc, [curr]: curr }), {});
};

const PetTypes = toElysiaEnum(petTypeEnum);
const PetStatuses = toElysiaEnum(petStatusEnum);

const hasRole = (user: { roles?: string[] | null }, requiredRole: string) => {
  return user.roles?.includes(requiredRole) ?? false;
};

export const catalogController = new Elysia({ prefix: '/catalog' }).guard(
  {
    detail: { tags: ['Pets'] },
  },
  (app) =>
    app.group('/pets', (app) =>
      app

        // --- Public Routes ---

        // Search Pets
        .get(
          '/',
          async ({ query }) => {
            return await catalogService.findAll({
              type: query.type,
              minPrice: query.minPrice,
              maxPrice: query.maxPrice,
              keyword: query.keyword,
              breed: query.breed,
            });
          },
          {
            query: t.Object({
              minPrice: t.Optional(
                t.Numeric({
                  default: 0,
                  description: 'Filter by minimum price (cents)',
                })
              ),
              maxPrice: t.Optional(
                t.Numeric({
                  default: 10000,
                  description: 'Filter by maximum price (cents)',
                })
              ),
              type: t.Optional(
                t.Enum(PetTypes, {
                  description: 'Filter by exact pet type',
                  examples: ['dog', 'cat'],
                })
              ),
              keyword: t.Optional(
                t.String({
                  default: 'Buddy',
                  description: 'Search by name',
                  examples: ['Buddy'],
                })
              ),
              breed: t.Optional(
                t.String({
                  default: 'Retriever',
                  description: 'Search by breed (partial match)',
                  examples: ['Retriever'],
                })
              ),
            }),
            detail: {
              summary: 'Search Pets',
              description: 'Public endpoint to filter pets.',
            },
          }
        )

        // Get Pet Details
        .get(
          '/:id',
          async ({ params, set }) => {
            const pet = await catalogService.findById(params.id);

            if (!pet) {
              set.status = 404;
              return { message: 'Pet not found' };
            }
            return pet;
          },
          {
            params: t.Object({
              id: t.Numeric({
                default: 1,
                description: 'The unique ID of the pet',
                examples: [1],
              }),
            }),
            detail: {
              summary: 'Get Pet Details',
            },
          }
        )

        // --- Protected Routes ---
        .use(isAuthenticated)

        // Create Pet
        .post(
          '/',
          async ({ user, body, set }) => {
            if (!hasRole(user, 'seller') && !hasRole(user, 'admin')) {
              set.status = 403;
              return { message: 'Forbidden: You must be a verified Seller to list pets.' };
            }

            return await catalogService.createPet(user.id, {
              ...body,
              ownerId: user.id,
              attributes: body.attributes || {},
            });
          },
          {
            body: t.Object(
              {
                name: t.String({ minLength: 2, maxLength: 100, default: 'Max' }),
                type: t.Enum(PetTypes, { default: 'dog' }),
                description: t.String({ default: 'A very friendly Golden Retriever' }),
                priceCents: t.Number({ minimum: 0, default: 15000 }),
                images: t.Optional(t.Array(t.String())),
                attributes: t.Optional(
                  t.Object({
                    breed: t.Optional(t.String({ default: 'Golden Retriever' })),
                    age_months: t.Optional(t.Number({ default: 24 })),
                    color: t.Optional(t.String({ default: 'Golden' })),
                    sex: t.Optional(
                      t.Enum({ male: 'male', female: 'female' }, { default: 'male' })
                    ),
                    weight_kg: t.Optional(t.Number({ default: 30 })),
                    is_vaccinated: t.Optional(t.Boolean({ default: true })),
                  })
                ),
              },
              {
                examples: [
                  {
                    name: 'Max',
                    type: 'dog',
                    description: 'A very friendly Golden Retriever looking for a home.',
                    priceCents: 15000,
                    images: ['https://example.com/max.jpg'],
                    attributes: {
                      breed: 'Golden Retriever',
                      age_months: 24,
                      color: 'Golden',
                      sex: 'male',
                      weight_kg: 30,
                      is_vaccinated: true,
                    },
                  },
                ],
              }
            ),
            detail: {
              summary: 'Create Pet Listing',
              description: 'Sellers can list a new pet for sale.',
            },
          }
        )

        // Update Pet
        .patch(
          '/:id',
          async ({ user, params, body, set }) => {
            if (!hasRole(user, 'seller') && !hasRole(user, 'admin')) {
              set.status = 403;
              return { message: 'Forbidden: You must be a Seller to update listings.' };
            }

            return await catalogService.updatePet(params.id, user.id, body);
          },
          {
            params: t.Object({
              id: t.Numeric({ default: 1 }),
            }),
            body: t.Object(
              {
                name: t.Optional(t.String()),
                description: t.Optional(t.String()),
                priceCents: t.Optional(t.Number()),
                status: t.Optional(t.Enum(PetStatuses, { default: 'available' })),
                attributes: t.Optional(
                  t.Object({
                    breed: t.Optional(t.String()),
                    age_months: t.Optional(t.Number()),
                    color: t.Optional(t.String()),
                    sex: t.Optional(t.Enum({ male: 'male', female: 'female' })),
                    weight_kg: t.Optional(t.Number()),
                    is_vaccinated: t.Optional(t.Boolean()),
                  })
                ),
              },
              {
                examples: [
                  {
                    priceCents: 12000,
                    status: 'pending',
                    description: 'Update: Max is currently pending adoption.',
                    attributes: {
                      is_vaccinated: true,
                    },
                  },
                ],
              }
            ),
            detail: {
              summary: 'Update Pet Listing',
            },
          }
        )

        // Delete Pet
        .delete(
          '/:id',
          async ({ user, params, set }) => {
            if (!hasRole(user, 'seller') && !hasRole(user, 'admin')) {
              set.status = 403;
              return { message: 'Forbidden: You must be a Seller to delete listings.' };
            }

            return await catalogService.deletePet(params.id, user.id);
          },
          {
            params: t.Object({
              id: t.Numeric({ default: 1 }),
            }),
            detail: {
              summary: 'Delete Listing',
            },
          }
        )
    )
);
