import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  uniqueIndex,
  index,
  primaryKey,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

// -----------------------------------------------------------------------------
// 1. Users Table
// -----------------------------------------------------------------------------
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    email: varchar("email", { length: 255 }).notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    fullName: varchar("full_name", { length: 255 }).notNull(),
    role: varchar("role", { length: 50 }).notNull().default("user"), // 'user' | 'admin'
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    emailIdx: index("users_email_idx").on(table.email),
    roleIdx: index("users_role_idx").on(table.role),
  })
);

// -----------------------------------------------------------------------------
// 2. Genres Table
// -----------------------------------------------------------------------------
export const genres = pgTable(
  "genres",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    name: varchar("name", { length: 100 }).notNull().unique(),
    slug: varchar("slug", { length: 100 }).notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    slugIdx: index("genres_slug_idx").on(table.slug),
  })
);

// -----------------------------------------------------------------------------
// 3. Movies Table
// -----------------------------------------------------------------------------
export const movies = pgTable(
  "movies",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    title: varchar("title", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 255 }).notNull().unique(),
    description: text("description").notNull(),
    posterUrl: text("poster_url").notNull(),
    backdropUrl: text("backdrop_url").notNull(),
    trailerUrl: text("trailer_url"),
    durationMins: integer("duration_mins").notNull(),
    releaseDate: timestamp("release_date", { withTimezone: true, mode: "date" }).notNull(),
    language: varchar("language", { length: 50 }).notNull().default("English"),
    rating: varchar("rating", { length: 20 }).notNull().default("PG-13"), // G, PG, PG-13, R, NC-17
    isFeatured: boolean("is_featured").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    titleIdx: index("movies_title_idx").on(table.title),
    featuredIdx: index("movies_featured_idx").on(table.isFeatured),
  })
);

// -----------------------------------------------------------------------------
// 4. Movie Genres (Junction)
// -----------------------------------------------------------------------------
export const movieGenres = pgTable(
  "movie_genres",
  {
    movieId: uuid("movie_id")
      .notNull()
      .references(() => movies.id, { onDelete: "cascade" }),
    genreId: uuid("genre_id")
      .notNull()
      .references(() => genres.id, { onDelete: "cascade" }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.movieId, table.genreId] }),
  })
);

// -----------------------------------------------------------------------------
// 5. Cinemas Table
// -----------------------------------------------------------------------------
export const cinemas = pgTable(
  "cinemas",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    name: varchar("name", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 255 }).notNull().unique(),
    address: text("address").notNull(),
    city: varchar("city", { length: 100 }).notNull(),
    state: varchar("state", { length: 100 }).notNull(),
    postalCode: varchar("postal_code", { length: 20 }).notNull(),
    phone: varchar("phone", { length: 50 }),
    email: varchar("email", { length: 255 }),
    imageUrl: text("image_url"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    cityIdx: index("cinemas_city_idx").on(table.city),
  })
);

// -----------------------------------------------------------------------------
// 6. Auditoriums Table
// Unique constraint on (cinema_id, name)
// -----------------------------------------------------------------------------
export const auditoriums = pgTable(
  "auditoriums",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    cinemaId: uuid("cinema_id")
      .notNull()
      .references(() => cinemas.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 100 }).notNull(),
    screenType: varchar("screen_type", { length: 50 }).notNull().default("STANDARD"), // STANDARD, IMAX, DOLBY_CINEMA, VIP
    totalSeats: integer("total_seats").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    cinemaAuditoriumUnique: uniqueIndex("auditoriums_cinema_name_unique").on(
      table.cinemaId,
      table.name
    ),
  })
);

// -----------------------------------------------------------------------------
// 7. Seats Table
// Unique constraint on (auditorium_id, row_label, seat_number)
// -----------------------------------------------------------------------------
export const seats = pgTable(
  "seats",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    auditoriumId: uuid("auditorium_id")
      .notNull()
      .references(() => auditoriums.id, { onDelete: "cascade" }),
    rowLabel: varchar("row_label", { length: 10 }).notNull(),
    seatNumber: integer("seat_number").notNull(),
    seatType: varchar("seat_type", { length: 50 }).notNull().default("STANDARD"), // STANDARD, VIP, RECLINER, WHEELCHAIR
    priceMultiplier: integer("price_multiplier").notNull().default(100), // percentage basis: 100 = 1.0x, 150 = 1.5x
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    auditoriumSeatUnique: uniqueIndex("seats_auditorium_row_num_unique").on(
      table.auditoriumId,
      table.rowLabel,
      table.seatNumber
    ),
    auditoriumIdx: index("seats_auditorium_idx").on(table.auditoriumId),
  })
);

// -----------------------------------------------------------------------------
// 8. Showtimes Table
// base_price_cents stored as integer minor units
// -----------------------------------------------------------------------------
export const showtimes = pgTable(
  "showtimes",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    movieId: uuid("movie_id")
      .notNull()
      .references(() => movies.id, { onDelete: "cascade" }),
    auditoriumId: uuid("auditorium_id")
      .notNull()
      .references(() => auditoriums.id, { onDelete: "cascade" }),
    startTime: timestamp("start_time", { withTimezone: true, mode: "date" }).notNull(),
    endTime: timestamp("end_time", { withTimezone: true, mode: "date" }).notNull(),
    basePriceCents: integer("base_price_cents").notNull(), // e.g. 1500 = $15.00
    format: varchar("format", { length: 50 }).notNull().default("2D"), // 2D, 3D, IMAX, DOLBY
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    movieStartTimeIdx: index("showtimes_movie_start_idx").on(
      table.movieId,
      table.startTime
    ),
    auditoriumStartTimeIdx: index("showtimes_auditorium_start_idx").on(
      table.auditoriumId,
      table.startTime
    ),
  })
);

// -----------------------------------------------------------------------------
// 9. Showtime Seats Table
// Unique constraint prevents same showtime seat from being booked twice:
// uniqueIndex on (showtime_id, seat_id)
// status: AVAILABLE, HELD, BOOKED, BLOCKED
// -----------------------------------------------------------------------------
export const showtimeSeats = pgTable(
  "showtime_seats",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    showtimeId: uuid("showtime_id")
      .notNull()
      .references(() => showtimes.id, { onDelete: "cascade" }),
    seatId: uuid("seat_id")
      .notNull()
      .references(() => seats.id, { onDelete: "cascade" }),
    status: varchar("status", { length: 50 }).notNull().default("AVAILABLE"), // AVAILABLE, HELD, BOOKED, BLOCKED
    heldUntil: timestamp("held_until", { withTimezone: true, mode: "date" }),
    bookingId: uuid("booking_id"), // links to pending or confirmed booking
    priceCents: integer("price_cents").notNull(), // calculated base * multiplier
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    showtimeSeatUnique: uniqueIndex("showtime_seats_showtime_seat_unique").on(
      table.showtimeId,
      table.seatId
    ),
    statusIdx: index("showtime_seats_status_idx").on(table.status),
    heldUntilIdx: index("showtime_seats_held_until_idx").on(table.heldUntil),
  })
);

// -----------------------------------------------------------------------------
// 10. Bookings Table
// status: PENDING, CONFIRMED, CANCELLED, EXPIRED, REFUNDED
// All money in integer minor units (cents)
// -----------------------------------------------------------------------------
export const bookings = pgTable(
  "bookings",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    showtimeId: uuid("showtime_id")
      .notNull()
      .references(() => showtimes.id, { onDelete: "cascade" }),
    bookingReference: varchar("booking_reference", { length: 64 })
      .notNull()
      .unique(),
    status: varchar("status", { length: 50 }).notNull().default("PENDING"), // PENDING, CONFIRMED, CANCELLED, EXPIRED, REFUNDED
    subtotalCents: integer("subtotal_cents").notNull(),
    bookingFeeCents: integer("booking_fee_cents").notNull().default(150), // e.g. $1.50 flat fee
    taxCents: integer("tax_cents").notNull().default(0), // 8% sales tax
    totalCents: integer("total_cents").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    userIdIdx: index("bookings_user_idx").on(table.userId),
    refIdx: index("bookings_ref_idx").on(table.bookingReference),
    statusIdx: index("bookings_status_idx").on(table.status),
  })
);

// -----------------------------------------------------------------------------
// 11. Booking Items Table
// -----------------------------------------------------------------------------
export const bookingItems = pgTable(
  "booking_items",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    bookingId: uuid("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    showtimeSeatId: uuid("showtime_seat_id")
      .notNull()
      .references(() => showtimeSeats.id, { onDelete: "cascade" }),
    seatId: uuid("seat_id")
      .notNull()
      .references(() => seats.id, { onDelete: "cascade" }),
    unitPriceCents: integer("unit_price_cents").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    bookingIdIdx: index("booking_items_booking_idx").on(table.bookingId),
  })
);

// -----------------------------------------------------------------------------
// 12. Payments Table
// status: PENDING, SUCCEEDED, FAILED, REFUNDED
// Idempotency key prevents duplicate charges
// -----------------------------------------------------------------------------
export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    bookingId: uuid("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    amountCents: integer("amount_cents").notNull(),
    currency: varchar("currency", { length: 10 }).notNull().default("USD"),
    provider: varchar("provider", { length: 50 }).notNull().default("STRIPE_TEST"),
    status: varchar("status", { length: 50 }).notNull().default("PENDING"), // PENDING, SUCCEEDED, FAILED, REFUNDED
    paymentIntentId: varchar("payment_intent_id", { length: 255 }),
    idempotencyKey: varchar("idempotency_key", { length: 255 }).notNull().unique(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    idempotencyIdx: index("payments_idempotency_idx").on(table.idempotencyKey),
    bookingIdx: index("payments_booking_idx").on(table.bookingId),
  })
);

// -----------------------------------------------------------------------------
// 13. Tickets Table
// Digital ticket with unique ticket code and QR payload
// -----------------------------------------------------------------------------
export const tickets = pgTable(
  "tickets",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    bookingId: uuid("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    showtimeSeatId: uuid("showtime_seat_id")
      .notNull()
      .references(() => showtimeSeats.id, { onDelete: "cascade" }),
    ticketCode: varchar("ticket_code", { length: 64 }).notNull().unique(),
    qrPayload: text("qr_payload").notNull(),
    isUsed: boolean("is_used").notNull().default(false),
    usedAt: timestamp("used_at", { withTimezone: true, mode: "date" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    ticketCodeIdx: index("tickets_code_idx").on(table.ticketCode),
    bookingIdx: index("tickets_booking_idx").on(table.bookingId),
  })
);

// -----------------------------------------------------------------------------
// 14. Audit Logs Table
// -----------------------------------------------------------------------------
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    action: varchar("action", { length: 100 }).notNull(), // e.g. "SEAT_HELD", "BOOKING_CONFIRMED", "BOOKING_CANCELLED"
    entityType: varchar("entity_type", { length: 100 }).notNull(), // "BOOKING", "PAYMENT", "SHOWTIME", etc.
    entityId: varchar("entity_id", { length: 255 }).notNull(),
    details: jsonb("details").$type<Record<string, unknown>>().default({}),
    ipAddress: varchar("ip_address", { length: 64 }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    entityIdx: index("audit_logs_entity_idx").on(table.entityType, table.entityId),
    createdAtIdx: index("audit_logs_created_idx").on(table.createdAt),
  })
);

// -----------------------------------------------------------------------------
// Relations
// -----------------------------------------------------------------------------
export const usersRelations = relations(users, ({ many }) => ({
  bookings: many(bookings),
  payments: many(payments),
  auditLogs: many(auditLogs),
}));

export const moviesRelations = relations(movies, ({ many }) => ({
  movieGenres: many(movieGenres),
  showtimes: many(showtimes),
}));

export const genresRelations = relations(genres, ({ many }) => ({
  movieGenres: many(movieGenres),
}));

export const movieGenresRelations = relations(movieGenres, ({ one }) => ({
  movie: one(movies, {
    fields: [movieGenres.movieId],
    references: [movies.id],
  }),
  genre: one(genres, {
    fields: [movieGenres.genreId],
    references: [genres.id],
  }),
}));

export const cinemasRelations = relations(cinemas, ({ many }) => ({
  auditoriums: many(auditoriums),
}));

export const auditoriumsRelations = relations(auditoriums, ({ one, many }) => ({
  cinema: one(cinemas, {
    fields: [auditoriums.cinemaId],
    references: [cinemas.id],
  }),
  seats: many(seats),
  showtimes: many(showtimes),
}));

export const seatsRelations = relations(seats, ({ one, many }) => ({
  auditorium: one(auditoriums, {
    fields: [seats.auditoriumId],
    references: [auditoriums.id],
  }),
  showtimeSeats: many(showtimeSeats),
}));

export const showtimesRelations = relations(showtimes, ({ one, many }) => ({
  movie: one(movies, {
    fields: [showtimes.movieId],
    references: [movies.id],
  }),
  auditorium: one(auditoriums, {
    fields: [showtimes.auditoriumId],
    references: [auditoriums.id],
  }),
  showtimeSeats: many(showtimeSeats),
  bookings: many(bookings),
}));

export const showtimeSeatsRelations = relations(showtimeSeats, ({ one }) => ({
  showtime: one(showtimes, {
    fields: [showtimeSeats.showtimeId],
    references: [showtimes.id],
  }),
  seat: one(seats, {
    fields: [showtimeSeats.seatId],
    references: [seats.id],
  }),
  booking: one(bookings, {
    fields: [showtimeSeats.bookingId],
    references: [bookings.id],
  }),
}));

export const bookingsRelations = relations(bookings, ({ one, many }) => ({
  user: one(users, {
    fields: [bookings.userId],
    references: [users.id],
  }),
  showtime: one(showtimes, {
    fields: [bookings.showtimeId],
    references: [showtimes.id],
  }),
  items: many(bookingItems),
  payments: many(payments),
  tickets: many(tickets),
}));

export const bookingItemsRelations = relations(bookingItems, ({ one }) => ({
  booking: one(bookings, {
    fields: [bookingItems.bookingId],
    references: [bookings.id],
  }),
  showtimeSeat: one(showtimeSeats, {
    fields: [bookingItems.showtimeSeatId],
    references: [showtimeSeats.id],
  }),
  seat: one(seats, {
    fields: [bookingItems.seatId],
    references: [seats.id],
  }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  booking: one(bookings, {
    fields: [payments.bookingId],
    references: [bookings.id],
  }),
  user: one(users, {
    fields: [payments.userId],
    references: [users.id],
  }),
}));

export const ticketsRelations = relations(tickets, ({ one }) => ({
  booking: one(bookings, {
    fields: [tickets.bookingId],
    references: [bookings.id],
  }),
  showtimeSeat: one(showtimeSeats, {
    fields: [tickets.showtimeSeatId],
    references: [showtimeSeats.id],
  }),
}));
