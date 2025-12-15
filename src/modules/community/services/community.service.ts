// src/modules/community/services/community.service.ts

import { eq, desc, and } from 'drizzle-orm';
import { db } from '../../../shared/db/index_db';
import { posts, comments } from '../models/schema';
import { petTypeEnum } from '../../catalog/models/schema';

export class CommunityService {
  /**
   * Get all posts, optionally filtered by pet type
   */
  async getPosts(filterType?: (typeof petTypeEnum.enumValues)[number]) {
    const conditions = [];
    if (filterType) {
      conditions.push(eq(posts.lookingForType, filterType));
    }

    const allPosts = await db.query.posts.findMany({
      where: conditions.length ? and(...conditions) : undefined,
      with: {
        author: {
          columns: {
            id: true,
            name: true,
            image: true,
            roles: true,
          },
        },
        comments: {
          with: {
            author: {
              columns: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
          orderBy: [desc(comments.createdAt)],
          limit: 3,
        },
      },
      orderBy: [desc(posts.createdAt)],
    });

    return allPosts;
  }

  /**
   * Get a single post with all comments
   */
  async getPostById(postId: number) {
    return await db.query.posts.findFirst({
      where: eq(posts.id, postId),
      with: {
        author: {
          columns: {
            id: true,
            name: true,
            image: true,
            roles: true,
          },
        },
        comments: {
          with: {
            author: {
              columns: {
                id: true,
                name: true,
                image: true,
                roles: true,
              },
            },
          },
          orderBy: [desc(comments.createdAt)],
        },
      },
    });
  }

  /**
   * Create a new "Looking For" post
   */
  async createPost(
    authorId: string,
    data: { title: string; content: string; lookingForType?: string }
  ) {
    const [newPost] = await db
      .insert(posts)
      .values({
        authorId,
        title: data.title,
        content: data.content,
        lookingForType: data.lookingForType as any,
      })
      .returning();

    return newPost;
  }

  /**
   * Add a comment to a post
   */
  async addComment(authorId: string, postId: number, content: string) {
    const post = await db.query.posts.findFirst({
      where: eq(posts.id, postId),
    });
    if (!post) {
      throw new Error('Post not found');
    }

    const [newComment] = await db
      .insert(comments)
      .values({
        authorId,
        postId,
        content,
      })
      .returning();

    const commentWithAuthor = await db.query.comments.findFirst({
      where: eq(comments.id, newComment.id),
      with: {
        author: {
          columns: { id: true, name: true, image: true, roles: true },
        },
      },
    });

    return commentWithAuthor;
  }

  /**
   * Delete a post
   */
  async deletePost(postId: number, userId: string, isAdmin: boolean = false) {
    const post = await db.query.posts.findFirst({ where: eq(posts.id, postId) });

    if (!post) {
      throw new Error('Post not found');
    }

    if (post.authorId !== userId && !isAdmin) {
      throw new Error('Unauthorized');
    }

    await db.delete(comments).where(eq(comments.postId, postId));
    await db.delete(posts).where(eq(posts.id, postId));

    return { success: true };
  }
}

export const communityService = new CommunityService();
