import * as schema from "./schema";

let dbInstance: any = null;
let pgliteClient: any = null;

export async function getDb(): Promise<any> {
  if (dbInstance) {
    return dbInstance;
  }

  const connectionString = process.env.DATABASE_URL;

  // 1. If DATABASE_URL is provided and valid (e.g. Neon PostgreSQL), use postgres.js / Neon
  if (connectionString && connectionString.startsWith("postgres")) {
    try {
      const { drizzle } = await import("drizzle-orm/postgres-js");
      const postgres = (await import("postgres")).default;
      
      const client = postgres(connectionString, {
        max: 10,
        idle_timeout: 20,
        connect_timeout: 10,
        prepare: false, // Recommended for Neon pooler
      });
      
      dbInstance = drizzle(client, { schema });
      return dbInstance;
    } catch (err) {
      console.warn("Could not connect to PostgreSQL via DATABASE_URL, falling back to local PGlite:", err);
    }
  }

  // 2. Local fallback using PGlite (embedded PostgreSQL in WASM)
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");

  const dataDir = process.env.NODE_ENV === "test" ? undefined : "./.cinebook_data";
  pgliteClient = new PGlite(dataDir);
  await pgliteClient.waitReady;

  await initializePgliteSchema(pgliteClient);

  dbInstance = drizzle(pgliteClient, { schema });
  return dbInstance;
}

async function initializePgliteSchema(client: any) {
  const tableDefinitions = [
    `CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(255) NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      full_name VARCHAR(255) NOT NULL,
      role VARCHAR(50) NOT NULL DEFAULT 'user',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );`,
    `CREATE TABLE IF NOT EXISTS genres (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(100) NOT NULL UNIQUE,
      slug VARCHAR(100) NOT NULL UNIQUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );`,
    `CREATE TABLE IF NOT EXISTS movies (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title VARCHAR(255) NOT NULL,
      slug VARCHAR(255) NOT NULL UNIQUE,
      description TEXT NOT NULL,
      poster_url TEXT NOT NULL,
      backdrop_url TEXT NOT NULL,
      trailer_url TEXT,
      duration_mins INT NOT NULL,
      release_date TIMESTAMPTZ NOT NULL,
      language VARCHAR(50) NOT NULL DEFAULT 'English',
      rating VARCHAR(20) NOT NULL DEFAULT 'PG-13',
      is_featured BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );`,
    `CREATE TABLE IF NOT EXISTS movie_genres (
      movie_id UUID NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
      genre_id UUID NOT NULL REFERENCES genres(id) ON DELETE CASCADE,
      PRIMARY KEY (movie_id, genre_id)
    );`,
    `CREATE TABLE IF NOT EXISTS cinemas (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      slug VARCHAR(255) NOT NULL UNIQUE,
      address TEXT NOT NULL,
      city VARCHAR(100) NOT NULL,
      state VARCHAR(100) NOT NULL,
      postal_code VARCHAR(20) NOT NULL,
      phone VARCHAR(50),
      email VARCHAR(255),
      image_url TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );`,
    `CREATE TABLE IF NOT EXISTS auditoriums (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      cinema_id UUID NOT NULL REFERENCES cinemas(id) ON DELETE CASCADE,
      name VARCHAR(100) NOT NULL,
      screen_type VARCHAR(50) NOT NULL DEFAULT 'STANDARD',
      total_seats INT NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT auditoriums_cinema_name_unique UNIQUE (cinema_id, name)
    );`,
    `CREATE TABLE IF NOT EXISTS seats (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      auditorium_id UUID NOT NULL REFERENCES auditoriums(id) ON DELETE CASCADE,
      row_label VARCHAR(10) NOT NULL,
      seat_number INT NOT NULL,
      seat_type VARCHAR(50) NOT NULL DEFAULT 'STANDARD',
      price_multiplier INT NOT NULL DEFAULT 100,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT seats_auditorium_row_num_unique UNIQUE (auditorium_id, row_label, seat_number)
    );`,
    `CREATE TABLE IF NOT EXISTS showtimes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      movie_id UUID NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
      auditorium_id UUID NOT NULL REFERENCES auditoriums(id) ON DELETE CASCADE,
      start_time TIMESTAMPTZ NOT NULL,
      end_time TIMESTAMPTZ NOT NULL,
      base_price_cents INT NOT NULL,
      format VARCHAR(50) NOT NULL DEFAULT '2D',
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );`,
    `CREATE TABLE IF NOT EXISTS showtime_seats (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      showtime_id UUID NOT NULL REFERENCES showtimes(id) ON DELETE CASCADE,
      seat_id UUID NOT NULL REFERENCES seats(id) ON DELETE CASCADE,
      status VARCHAR(50) NOT NULL DEFAULT 'AVAILABLE',
      held_until TIMESTAMPTZ,
      booking_id UUID,
      price_cents INT NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT showtime_seats_showtime_seat_unique UNIQUE (showtime_id, seat_id)
    );`,
    `CREATE TABLE IF NOT EXISTS bookings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      showtime_id UUID NOT NULL REFERENCES showtimes(id) ON DELETE CASCADE,
      booking_reference VARCHAR(64) NOT NULL UNIQUE,
      status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
      subtotal_cents INT NOT NULL,
      booking_fee_cents INT NOT NULL DEFAULT 150,
      tax_cents INT NOT NULL DEFAULT 0,
      total_cents INT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );`,
    `CREATE TABLE IF NOT EXISTS booking_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
      showtime_seat_id UUID NOT NULL REFERENCES showtime_seats(id) ON DELETE CASCADE,
      seat_id UUID NOT NULL REFERENCES seats(id) ON DELETE CASCADE,
      unit_price_cents INT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );`,
    `CREATE TABLE IF NOT EXISTS payments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      amount_cents INT NOT NULL,
      currency VARCHAR(10) NOT NULL DEFAULT 'USD',
      provider VARCHAR(50) NOT NULL DEFAULT 'STRIPE_TEST',
      status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
      payment_intent_id VARCHAR(255),
      idempotency_key VARCHAR(255) NOT NULL UNIQUE,
      metadata JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );`,
    `CREATE TABLE IF NOT EXISTS tickets (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
      showtime_seat_id UUID NOT NULL REFERENCES showtime_seats(id) ON DELETE CASCADE,
      ticket_code VARCHAR(64) NOT NULL UNIQUE,
      qr_payload TEXT NOT NULL,
      is_used BOOLEAN NOT NULL DEFAULT false,
      used_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );`,
    `CREATE TABLE IF NOT EXISTS audit_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      action VARCHAR(100) NOT NULL,
      entity_type VARCHAR(100) NOT NULL,
      entity_id VARCHAR(255) NOT NULL,
      details JSONB DEFAULT '{}'::jsonb,
      ip_address VARCHAR(64),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );`,
  ];

  for (const query of tableDefinitions) {
    try {
      await client.exec(query);
    } catch (err) {
      console.error("Error executing query:", query, err);
      throw err;
    }
  }
}

export const db = new Proxy({} as any, {
  get(_target, prop) {
    return async (...args: any[]) => {
      const activeDb = await getDb();
      const val = activeDb[prop];
      if (typeof val === "function") {
        return val.apply(activeDb, args);
      }
      return val;
    };
  },
});
