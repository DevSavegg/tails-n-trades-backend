import { Elysia, t } from 'elysia'
import { cors } from '@elysiajs/cors'
import { swagger } from '@elysiajs/swagger'
import { auth } from './lib/auth'

const UserSchema = t.Object({
    id: t.String(),
    email: t.String(),
    emailVerified: t.Boolean(),
    name: t.String(),
    createdAt: t.String(),
    updatedAt: t.String(),
    image: t.Optional(t.String())
})

const SessionSchema = t.Object({
    id: t.String(),
    userId: t.String(),
    expiresAt: t.String(),
    ipAddress: t.Optional(t.String()),
    userAgent: t.Optional(t.String())
})

const AuthResponse = t.Object({
    user: UserSchema,
    session: SessionSchema
})

const taskList: Array<{ id: number, title: string, completed: boolean, createdBy: string }> = []

const forwardToAuth = (request: Request, body: any) => {
    return auth.handler(new Request(request.url, {
        method: request.method,
        headers: request.headers,
        body: JSON.stringify(body),
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
        title: 'Elysia Task API',
        version: '1.0.0',
        description: 'A simple API to demonstrate ElysiaJS + Better Auth'
      },
      tags: [
        { name: 'Tasks', description: 'Task management endpoints' },
        { name: 'Auth', description: 'Authentication endpoints' }
      ]
    }
  }))
  .decorate('tasks', taskList)
  .group('/api/auth', (app) => app
      .guard({ detail: { tags: ['Auth'] } })

      .post('/sign-up/email', ({ request, body }) => forwardToAuth(request, body) as any, {
          detail: { summary: 'Register a new user' },
          body: t.Object({
              name: t.String({ example: 'John Doe' }),
              email: t.String({ format: 'email', example: 'john@example.com' }),
              password: t.String({ minLength: 8, example: 'secret123' }),
              image: t.Optional(t.String())
          }),
          response: {
              200: AuthResponse,
              400: t.Object({ message: t.String() })
          }
      })

      .post('/sign-in/email', ({ request, body }) => forwardToAuth(request, body) as any, {
          detail: { summary: 'Sign in with Email/Password' },
          body: t.Object({
              email: t.String({ format: 'email', example: 'john@example.com' }),
              password: t.String({ example: 'secret123' }),
              rememberMe: t.Optional(t.Boolean())
          }),
          response: {
              200: AuthResponse,
              401: t.Object({ message: t.String() })
          }
      })

      .post('/sign-out', ({ request }) => auth.handler(request) as any, {
          detail: { summary: 'Revoke current session' },
          response: {
              200: t.Object({ success: t.Boolean() })
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

  .group('/api/tasks', (app) => app
    .guard({ detail: { tags: ['Tasks'] } })

    // GET /tasks
    .get('/', ({ tasks }) => tasks, {
      detail: { summary: 'Get all tasks' },
      response: t.Array(
        t.Object({
          id: t.Number(),
          title: t.String(),
          completed: t.Boolean()
        })
      )
    })

    // POST /tasks
    .post('/', ({ body, tasks, user, set }) => {
      if (!user) {
        set.status = 401
        return { message: "Unauthorized: You must be logged in" }
      }

      const newTask = {
        id: tasks.length + 1,
        title: body.title,
        completed: false,
        createdBy: user.id 
      }
      tasks.push(newTask)
      return newTask
    }, {
      detail: { summary: 'Create a new task (Requires Auth)' },
      body: t.Object({
        title: t.String({ minLength: 3, example: 'Buy groceries' })
      }),
      response: {
        200: t.Object({
          id: t.Number(),
          title: t.String(),
          completed: t.Boolean()
        }),
        401: t.Object({ message: t.String() })
      }
    })

    // GET /tasks/:id
    .get('/:id', ({ params, tasks, set }) => {
      const task = tasks.find(t => t.id === params.id)
      
      if (!task) {
        set.status = 404
        return { message: 'Task not found' }
      }
      
      return task
    }, {
      detail: { summary: 'Get a specific task' },
      params: t.Object({
        id: t.Numeric()
      })
    })
  )
  .listen(3000)

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
)