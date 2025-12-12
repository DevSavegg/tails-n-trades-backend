import { Elysia, t } from 'elysia'
import { cors } from '@elysiajs/cors'
import { swagger } from '@elysiajs/swagger'
import { eq } from 'drizzle-orm'
import { auth } from './lib/auth'
import { db } from './db/index_db'
import * as schema from './db/schema'

// --- Response Schemas ---

const UserSchema = t.Object({
    id: t.String(),
    email: t.String(),
    emailVerified: t.Boolean(),
    name: t.String(),
    createdAt: t.Date(),
    updatedAt: t.Date(),
    image: t.Optional(t.Nullable(t.String())),
    role: t.Optional(t.String())
})

const SessionSchema = t.Object({
    id: t.String(),
    userId: t.String(),
    expiresAt: t.Date(),
    token: t.String(),
    createdAt: t.Date(),
    updatedAt: t.Date(),
})

const AuthResponse = t.Object({
    user: UserSchema,
    session: SessionSchema
})

const PetSchema = t.Object({
    id: t.Number(),
    ownerId: t.String(),
    name: t.String(),
    category: t.String(),
    priceCents: t.Number(),
    status: t.Nullable(t.String()),
    createdAt: t.Nullable(t.Date()),
})

// --- Helper ---
const forwardToAuth = (request: Request, body: any) => {
    const newBody = typeof body === 'object' ? JSON.stringify(body) : body;
    return auth.handler(new Request(request.url, {
        method: request.method,
        headers: request.headers,
        body: newBody,
    }));
}

const app = new Elysia()
  .use(cors({
        origin: "http://localhost:8080",
        credentials: true,
        allowedHeaders: ['Content-Type', 'Authorization'],
  }))
  .use(swagger({
    documentation: {
      info: {
        title: 'Pet Store API',
        version: '1.0.0',
        description: 'ElysiaJS + Better Auth + Drizzle ORM Demo'
      },
      tags: [
        { name: 'Pets', description: 'Manage pet catalog' },
        { name: 'Auth', description: 'Authentication endpoints' }
      ]
    }
  }))
  
  // --- Auth Routes ---
  .group('/api/auth', (app) => app
      .guard({ detail: { tags: ['Auth'] } })
      .post('/sign-up/email', ({ request, body }) => forwardToAuth(request, body) as any, {
          detail: { summary: 'Register new account' },
          body: t.Object({
              name: t.String({ example: 'John Doe' }),
              email: t.String({ format: 'email', example: 'john@example.com' }),
              password: t.String({ minLength: 8, example: 'SecurePass123!' }),
          })
      })
      .post('/sign-in/email', ({ request, body }) => forwardToAuth(request, body) as any, {
          detail: { summary: 'Authenticate with email' },
          body: t.Object({
              email: t.String({ format: 'email', example: 'john@example.com' }),
              password: t.String({ example: 'SecurePass123!' }),
          })
      })
      .post('/sign-out', ({ request }) => auth.handler(request) as any, {
          detail: { 
            summary: 'Sign out and invalidate session',
            description: 'Ends the current session and clears authentication cookies.'
          }
      })
      .all('/*', ({ request }) => auth.handler(request)) 
  )

  // --- Derive User Session ---
  .derive(async ({ request }) => {
    const session = await auth.api.getSession({ headers: request.headers });
    return {
      user: session?.user,
      session: session?.session
    }
  })

  // --- Pet Catalog Routes ---
  .group('/api/pets', (app) => app
    .guard({ detail: { tags: ['Pets'] } })

    // GET /api/pets - List all pets from DB
    .get('/', async () => {
      const allPets = await db.select().from(schema.pets);
      return allPets;
    }, {
      detail: { summary: 'Retrieve full pet catalog' },
      response: t.Array(PetSchema)
    })

    // POST /api/pets - Create a pet
    .post('/', async ({ body, user, set }) => {
      if (!user) {
        set.status = 401
        return { message: "Unauthorized: You must be logged in to list a pet." }
      }

      const [newPet] = await db.insert(schema.pets).values({
        name: body.name,
        category: body.category,
        priceCents: body.priceCents,
        ownerId: user.id,
        status: 'available',
        attributes: {}
      }).returning();

      return newPet;
    }, {
      detail: { summary: 'Create a new pet listing' },
      body: t.Object({
        name: t.String({ minLength: 2, example: 'Golden Retriever' }),
        category: t.String({ example: 'Dogs' }),
        priceCents: t.Number({ minimum: 0, example: 50000 })
      }),
      response: {
        200: PetSchema,
        401: t.Object({ message: t.String() })
      }
    })

    // GET /api/pets/:id - Get specific pet details
    .get('/:id', async ({ params, set }) => {
      const pet = await db.query.pets.findFirst({
        where: eq(schema.pets.id, params.id),
        with: {
            owner: true
        }
      });
      
      if (!pet) {
        set.status = 404
        return { message: 'Pet not found' }
      }
      
      return pet
    }, {
      detail: { summary: 'Retrieve pet details by ID' },
      params: t.Object({
        id: t.Numeric({ example: 1 })
      })
    })
  )
  .listen(3000)

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
)