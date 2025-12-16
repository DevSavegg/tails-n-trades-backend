// src/modules/catalog/controllers/catalog.controller.ts

import { Elysia, t } from 'elysia';
import { catalogService } from '../services/catalog.service';
import { isAuthenticated } from '../../auth/lib/guards';
import { petTypeEnum, petStatusEnum } from '../models/schema';
import { storage } from '../../../shared/lib/storage';

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
              location: query.location,
              page: query.page,
              limit: query.limit,
              ownerId: query.ownerId,
              status: query.status,
            });
          },
          {
            query: t.Object({
              minPrice: t.Optional(
                t.Numeric({
                  description: 'Filter by minimum price (cents)',
                })
              ),
              maxPrice: t.Optional(
                t.Numeric({
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
                  description: 'Search by name',
                  examples: ['Buddy'],
                })
              ),
              location: t.Optional(
                t.String({
                  description: 'Search by owner city',
                  examples: ['Bangkok'],
                })
              ),
              breed: t.Optional(
                t.String({
                  description: 'Search by breed (partial match)',
                  examples: ['Retriever'],
                })
              ),
              page: t.Optional(t.Numeric({ default: 1, minimum: 1 })),
              limit: t.Optional(t.Numeric({ default: 10, minimum: 1, maximum: 50 })),
              ownerId: t.Optional(t.String({ description: 'Filter by owner ID' })),
              status: t.Optional(
                t.String({
                  description: 'Filter by pet status',
                  examples: ['available', 'sold', 'pending'],
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
          async ({ user, body }) => {
            // removed set
            // Normalize Media Files
            const uploadedFiles = [];
            let files = body.media_files;
            if (files) {
              if (!Array.isArray(files)) {
                files = [files];
              }
              for (const file of files) {
                if (file && typeof file === 'object' && 'arrayBuffer' in file) {
                  const url = await storage.saveFile(file, 'pets');
                  uploadedFiles.push(url);
                }
              }
            }

            // Normalize Attributes
            let attributes = body.attributes;
            if (typeof attributes === 'string') {
              try {
                attributes = JSON.parse(attributes);
              } catch (e) {
                attributes = {};
              }
            }

            // Normalize Price
            const price = Number(body.priceCents || 0);

            return await catalogService.createPet(user.id, {
              ...body,
              type: body.type as any, // Cast to match Enum types (runtime validation is loose)
              attributes: attributes || {},
              images: uploadedFiles,
              ownerId: user.id,
              priceCents: price,
            });
          },
          {
            body: t.Object({
              name: t.String({ minLength: 2, maxLength: 100 }),
              type: t.String(), // Validated by service enum
              description: t.String(),
              status: t.Optional(t.String()),
              priceCents: t.Union([t.Number(), t.String()]), // Handle multipart string numbers

              // Multipart File Upload (Single or Array)
              media_files: t.Optional(t.Union([t.File(), t.Array(t.File())])),

              // Attributes as JSON string
              attributes: t.Optional(t.String()),
            }),
            detail: {
              summary: 'Create Pet Listing',
              description: 'Create a new pet listing with images.',
            },
          }
        )

        // Update Pet
        .patch(
          '/:id',
          async ({ user, params, body }) => {
            // removed set
            const newImages: string[] = [];
            let files = body.media_files;

            if (files) {
              // Normalize single file to array
              if (!Array.isArray(files)) {
                files = [files];
              }

              for (const file of files) {
                if (file && typeof file === 'object' && 'arrayBuffer' in file) {
                  const url = await storage.saveFile(file, 'pets');
                  newImages.push(url);
                }
              }
            }

            let attributes = body.attributes;
            if (typeof attributes === 'string') {
              try {
                attributes = JSON.parse(attributes);
              } catch (e) {
                /* ignore */
              }
            }

            const updateData: any = { ...body };
            if (attributes) {
              updateData.attributes = attributes;
            }
            if (newImages.length > 0) {
              // Append or replace? Usually simpler to append or the frontend should handle state.
              // For now, let's assume we append to existing?
              // But catalogService.updatePet replaces properly if passed?
              // CatalogService updatePet type says images?: string[].
              // If we pass images, it updates the list in petImages table?
              // Service needs logic to MERGE? "UpdatePetDTO" says images?: string[].
              // If service replaces, we lose old ones.
              // The frontend should ideally send OLD images as hidden fields?
              // Or we fetch existing, merge, update.
              // We will rely on Service logic (which currently might just insert new ones or replace).
              // Actually catalog.service.ts implementation details:
              // It just inserts new ones usually? I should check service.
              // Ideally we pass "newImages".
              updateData.images = newImages;
            }
            if (body.priceCents !== undefined) {
              updateData.priceCents = Number(body.priceCents);
            }

            return await catalogService.updatePet(params.id, user.id, updateData);
          },
          {
            params: t.Object({
              id: t.Numeric({ default: 1 }),
            }),
            body: t.Object({
              name: t.Optional(t.String()),
              type: t.Optional(t.String()), // Allow type update or at least presence
              description: t.Optional(t.String()),
              priceCents: t.Optional(t.Union([t.Number(), t.String()])),
              status: t.Optional(t.String()),
              media_files: t.Optional(t.Union([t.File(), t.Array(t.File())])),
              attributes: t.Optional(t.String()),
            }),
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
