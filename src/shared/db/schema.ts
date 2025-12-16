// src/shared/db/schema.ts

// --- Auth (Core Identity: User, Session, Account) ---
export * from '../../modules/auth/models/schema';
export * from '../../modules/auth/models/relations';

// --- Users (Profile Data) ---
export * from '../../modules/users/models/schema';
export * from '../../modules/users/models/relations';

// --- Catalog ---
export * from '../../modules/catalog/models/schema';
export * from '../../modules/catalog/models/relations';

// --- Sales ---
export * from '../../modules/sales/models/schema';
export * from '../../modules/sales/models/relations';

// --- Caretaking ---
export * from '../../modules/caretaking/models/schema';
export * from '../../modules/caretaking/models/relations';

// --- Community ---
export * from '../../modules/community/models/schema';
export * from '../../modules/community/models/relations';

// --- Favorites ---
export * from '../../modules/favorites/models/schema';
