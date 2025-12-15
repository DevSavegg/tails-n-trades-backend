// src/modules/community/controllers/community.controller.ts

import { Elysia, t } from 'elysia';
import { communityService } from '../services/community.service';
import { isAuthenticated } from '../../auth/lib/guards';

export const communityController = new Elysia({ prefix: '/community' }).guard(
  {
    detail: { tags: ['Community'] },
  },
  (app) =>
    app.group('/posts', (app) =>
      app
        // --- Public Routes ---

        // Get Feed
        .get(
          '/',
          async ({ query }) => {
            return await communityService.getPosts(query.type as any);
          },
          {
            query: t.Object({
              type: t.Optional(
                t.String({
                  default: 'general',
                  examples: ['general', 'looking_for', 'advice'],
                  description: 'Filter posts by category',
                })
              ),
            }),
            detail: {
              summary: 'Get Community Feed',
              description: 'Browse "Looking For" posts from customers.',
            },
          }
        )

        // Get Single Post
        .get(
          '/:id',
          async ({ params, set }) => {
            const post = await communityService.getPostById(Number(params.id));

            if (!post) {
              set.status = 404;
              return 'Post not found';
            }

            return post;
          },
          {
            params: t.Object({
              id: t.String({ default: '42', examples: ['42'] }),
            }),
            detail: {
              summary: 'Get Post Discussion',
            },
          }
        )

        // --- Protected Routes ---
        .use(isAuthenticated)

        // Create Post
        .post(
          '/',
          async ({ user, body }) => {
            return await communityService.createPost(user.id, body);
          },
          {
            body: t.Object({
              title: t.String({
                minLength: 5,
                maxLength: 255,
                default: 'Looking for grooming advice',
                examples: ['Looking for grooming advice'],
              }),
              content: t.String({
                minLength: 10,
                default: 'Does anyone know a good groomer in the downtown area?',
                examples: ['Does anyone know a good groomer in the downtown area?'],
              }),
              lookingForType: t.Optional(
                t.String({
                  default: 'advice',
                  examples: ['advice', 'service'],
                })
              ),
            }),
            detail: {
              summary: 'Create Post',
              description: 'Post a request to the community board.',
            },
          }
        )

        // Add Comment
        .post(
          '/:id/comments',
          async ({ user, params, body, set }) => {
            try {
              return await communityService.addComment(user.id, Number(params.id), body.content);
            } catch (e: any) {
              set.status = 404;
              return e.message;
            }
          },
          {
            params: t.Object({
              id: t.String({ default: '42', examples: ['42'] }),
            }),
            body: t.Object({
              content: t.String({
                minLength: 1,
                default: 'I recommend the one on 5th street!',
                examples: ['I recommend the one on 5th street!'],
              }),
            }),
            detail: {
              summary: 'Reply to Post',
              description: 'Add a comment to a community post.',
            },
          }
        )

        // Delete Post
        .delete(
          '/:id',
          async ({ user, params, set }) => {
            try {
              const isAdmin = user.roles?.includes('admin');

              return await communityService.deletePost(Number(params.id), user.id, isAdmin);
            } catch (e: any) {
              set.status = 403;
              return e.message;
            }
          },
          {
            params: t.Object({
              id: t.String({ default: '42', examples: ['42'] }),
            }),
            detail: {
              summary: 'Delete Post',
            },
          }
        )
    )
);
