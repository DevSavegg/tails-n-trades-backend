# Tails and Trades - Backend Server Infrastructure

**A resilient, modular monolith backend architecture designed for a comprehensive pet commerce and caretaking ecosystem.**

## Executive Summary

Tails and Trades functions as a holistic digital platform engineered to facilitate transactions and services within the pet ownership domain. The system streamlines the acquisition and sale of pets, coordinates professional caretaking services—such as grooming and boarding—and fosters community engagement through dedicated communication channels.

The backend infrastructure is architected upon a **Modular Monolith** design pattern. This approach ensures that each distinct business domain is encapsulated within discrete modules while leveraging shared core infrastructure, such as the database and logging mechanisms.

-----

## Core Capabilities

### Architectural Design

  * **Domain-Driven Modularity:** The codebase is structured according to business domains (`modules/`) rather than technical layers, promoting high cohesion and low coupling.
  * **Comprehensive Type Safety:** The system implements end-to-end type safety through the utilization of TypeScript and Drizzle ORM.
  * **Optimized Performance:** Built upon the ElysiaJS framework, the server is optimized for low-latency request processing and high throughput.

### Functional Modules

  * **Authentication & Authorization:** Implements enterprise-grade security via Better Auth.
  * **User Management:** Facilitates comprehensive profile administration.
  * **Catalog System:** Features a sophisticated pet marketplace equipped with advanced filtering capabilities.
  * **Transaction Processing:** Manages the complete lifecycle of sales orders with strict inventory locking mechanisms.
  * **Caretaking Services:** Provides a platform for service listing and appointment scheduling.
  * **Community Engagement:** Facilitates user interaction and resource discovery.

-----

## Technological Stack

| Category | Technology |
| :--- | :--- |
| **Runtime Environment** | Node.js / Bun |
| **Web Framework** | ElysiaJS |
| **Database** | PostgreSQL 16 (Alpine) |
| **ORM** | Drizzle ORM |
| **Authentication** | Better Auth |
| **Session Caching** | Redis 7 (Alpine) |
| **Message Queue** | RabbitMQ 3 (Management Alpine) [Not Used Yet] |
| **Infrastructure** | Docker Compose |
| **Management UIs** | PGAdmin 4, Redis Commander |
| **API Documentation** | Swagger / OpenAPI |
| **Logging** | Pino |

-----

## File Upload Handling

The application handles file uploads (user profiles, pet images) directly on the filesystem for simplicity and performance.

*   **Storage Location:** files are stored in the `uploads/` directory in the project root.
*   **Directory Structure:**
    *   `uploads/profiles/`: User profile pictures.
    *   `uploads/pets/`: Pet listing images.
*   **Docker Persistence:** The `docker-compose.yml` defines a volume mount (`./uploads:/app/uploads`) to ensure files persist across container restarts.
*   **Public Access:** Files are served via a dedicated `GET /uploads/*` route with CORS support.

-----

## Deployment Procedures

### System Requirements

  * **Bun** (Version 1.0 or higher)
  * **Docker** and **Docker Compose**

### 1\. Repository Initialization

Clone the repository and install the dependencies:

```bash
git clone https://github.com/DevSavegg/tails-n-trades-backend.git
cd tails-n-trades-backend
bun install
```

### 2\. Environment Configuration

Create a `.env` file in the root directory. This file must define the credentials used by the Docker services.

```ini
# Application Settings
NODE_ENV=production
LOG_LEVEL=info

# Database Credentials
POSTGRES_USER=root
POSTGRES_PASSWORD=secure_password
POSTGRES_DB=maindb

# Redis & RabbitMQ Credentials
RABBITMQ_DEFAULT_USER=admin
RABBITMQ_DEFAULT_PASS=secure_password

# Authentication
BETTER_AUTH_SECRET=your_super_secret_key
# Note: BETTER_AUTH_URL is set to http://localhost:3000 in docker-compose

# PGAdmin Credentials (for Database UI)
PGADMIN_EMAIL=admin@example.com
PGADMIN_PASSWORD=secure_password
```

### 3\. Service Execution

The project includes custom operation scripts to manage the Docker environment.

**Start the Infrastructure:**
This command spins up the backend app, PostgreSQL, Redis, RabbitMQ, and the management UIs.

```bash
bun docker:start
```

**Stop the Infrastructure:**

```bash
bun docker:stop
```

**Restart the Infrastructure:**

```bash
bun docker:restart
```

### 4\. Database Schema Migration

Once the containers are running, synchronize the database schema:

```bash
# Generate migration files
bun db:generate

# Apply migrations to the Docker container
bun db:docker:migrate
```

-----

## Access Points & Interfaces

Once the environment is running via `bun docker:start`, the following services are accessible:

| Service | URL | Description |
| :--- | :--- | :--- |
| **Backend API** | `http://localhost:3000` | Main application server |
| **API Documentation** | `http://localhost:3000/api/docs` | Swagger / OpenAPI interface |
| **PGAdmin** | `http://localhost:5050` | PostgreSQL management UI |
| **Redis Commander** | `http://localhost:8081` | Redis management UI |
| **RabbitMQ Management** | `http://localhost:15672` | Message queue monitoring |

-----

## Project Hierarchy

```text
src/
├── configs/              # Global system configurations (Drizzle, etc.)
├── infrastructures/      # Infrastructure provisioning
├── modules/              # Encapsulated Business Domains
│   ├── auth/             # Authentication & Session Management
│   ├── caretaking/       # Service Provisioning
│   ├── catalog/          # Inventory & Marketplace
│   ├── community/        # Social Interaction
│   ├── sales/            # Orders & Transactions
│   └── users/            # Identity Management
├── shared/               # Shared Kernel & Utilities
└── index.ts              # Application Entry Point
```

-----

## Contribution Guidelines

1.  Fork the repository.
2.  Create a dedicated feature branch (`git checkout -b feature/proposed-feature`).
3.  Commit changes (`git commit -m 'Implement proposed feature'`).
4.  Push to the origin (`git push origin feature/proposed-feature`).
5.  Submit a Pull Request.

## Licensing

This software is distributed under the MIT License. Please refer to the LICENSE file for detailed terms and conditions.