import { getDb } from "./index";
import {
  users,
  genres,
  movies,
  movieGenres,
  cinemas,
  auditoriums,
  seats,
  showtimes,
  showtimeSeats,
  auditLogs,
} from "./schema";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

export async function runSeed() {
  console.log("🎬 [CineBook Seed] Initializing database seeding...");
  const db = await getDb();

  // 1. Create Default Users (Admin and Customer)
  console.log("👤 Seeding users...");
  const adminPasswordHash = await bcrypt.hash("Admin123!", 10);
  const userPasswordHash = await bcrypt.hash("User123!", 10);

  const [adminUser] = await db
    .insert(users)
    .values({
      email: "admin@cinebook.com",
      passwordHash: adminPasswordHash,
      fullName: "CineBook Administrator",
      role: "admin",
    })
    .onConflictDoNothing()
    .returning();

  const [regularUser] = await db
    .insert(users)
    .values({
      email: "customer@cinebook.com",
      passwordHash: userPasswordHash,
      fullName: "Alex Mercer",
      role: "user",
    })
    .onConflictDoNothing()
    .returning();

  // 2. Create Genres
  console.log("🎭 Seeding genres...");
  const genreList = [
    { name: "Sci-Fi", slug: "sci-fi" },
    { name: "Action", slug: "action" },
    { name: "Adventure", slug: "adventure" },
    { name: "Drama", slug: "drama" },
    { name: "Thriller", slug: "thriller" },
    { name: "Animation", slug: "animation" },
  ];

  const insertedGenres: Record<string, string> = {};
  for (const g of genreList) {
    const [res] = await db
      .insert(genres)
      .values(g)
      .onConflictDoNothing()
      .returning();
    if (res) {
      insertedGenres[g.slug] = res.id;
    } else {
      const existing = await db.select().from(genres).where(eq(genres.slug, g.slug)).limit(1);
      if (existing.length) insertedGenres[g.slug] = existing[0].id;
    }
  }

  // 3. Create Cinemas
  console.log("🏛️ Seeding cinemas...");
  const cinemaData = [
    {
      name: "CineBook IMAX Grand",
      slug: "cinebook-imax-grand",
      address: "1200 Cinema Boulevard",
      city: "New York",
      state: "NY",
      postalCode: "10001",
      phone: "+1 (212) 555-0199",
      email: "grand@cinebook.com",
      imageUrl: "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=1200&q=80",
    },
    {
      name: "CineBook Dolby Uptown",
      slug: "cinebook-dolby-uptown",
      address: "450 Star Way, Suite 100",
      city: "Los Angeles",
      state: "CA",
      postalCode: "90028",
      phone: "+1 (310) 555-0144",
      email: "uptown@cinebook.com",
      imageUrl: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1200&q=80",
    },
    {
      name: "CineBook VIP Suites",
      slug: "cinebook-vip-suites",
      address: "88 Marina Drive",
      city: "Chicago",
      state: "IL",
      postalCode: "60601",
      phone: "+1 (312) 555-0177",
      email: "vip@cinebook.com",
      imageUrl: "https://images.unsplash.com/photo-1595769816263-9b910be24d5f?auto=format&fit=crop&w=1200&q=80",
    },
  ];

  const cinemaMap: Record<string, string> = {};
  for (const c of cinemaData) {
    const [inserted] = await db.insert(cinemas).values(c).onConflictDoNothing().returning();
    if (inserted) {
      cinemaMap[c.slug] = inserted.id;
    } else {
      const existing = await db.select().from(cinemas).where(eq(cinemas.slug, c.slug)).limit(1);
      if (existing.length) cinemaMap[c.slug] = existing[0].id;
    }
  }

  // 4. Create Auditoriums and Seats
  console.log("💺 Seeding auditoriums and seating layouts...");
  const auditoriumList: {
    cinemaId: string;
    name: string;
    screenType: "IMAX" | "DOLBY_CINEMA" | "VIP" | "STANDARD";
    rows: string[];
    seatsPerRow: number;
  }[] = [
    {
      cinemaId: cinemaMap["cinebook-imax-grand"],
      name: "Auditorium 1 (IMAX Laser)",
      screenType: "IMAX",
      rows: ["A", "B", "C", "D", "E", "F", "G"],
      seatsPerRow: 12,
    },
    {
      cinemaId: cinemaMap["cinebook-dolby-uptown"],
      name: "Auditorium 1 (Dolby Atmos)",
      screenType: "DOLBY_CINEMA",
      rows: ["A", "B", "C", "D", "E", "F"],
      seatsPerRow: 10,
    },
    {
      cinemaId: cinemaMap["cinebook-vip-suites"],
      name: "Auditorium Prime (Luxe Dine-in)",
      screenType: "VIP",
      rows: ["A", "B", "C", "D"],
      seatsPerRow: 8,
    },
  ];

  const createdAuditoriums: { id: string; seatIds: string[]; screenType: string }[] = [];

  for (const aud of auditoriumList) {
    if (!aud.cinemaId) continue;
    const totalSeatsCount = aud.rows.length * aud.seatsPerRow;

    const [insertedAud] = await db
      .insert(auditoriums)
      .values({
        cinemaId: aud.cinemaId,
        name: aud.name,
        screenType: aud.screenType,
        totalSeats: totalSeatsCount,
      })
      .onConflictDoNothing()
      .returning();

    let audId = insertedAud?.id;
    if (!audId) {
      const existingAud = await db
        .select()
        .from(auditoriums)
        .where(eq(auditoriums.name, aud.name))
        .limit(1);
      if (existingAud.length) audId = existingAud[0].id;
    }

    if (!audId) continue;

    // Create seats for this auditorium
    const currentSeatIds: string[] = [];
    for (const row of aud.rows) {
      for (let num = 1; num <= aud.seatsPerRow; num++) {
        let seatType = "STANDARD";
        let priceMultiplier = 100;

        // Tier allocation
        if (aud.screenType === "VIP" || row === "E" || row === "F" || row === "G") {
          seatType = "RECLINER";
          priceMultiplier = 140;
        } else if (row === "C" || row === "D") {
          seatType = "VIP";
          priceMultiplier = 120;
        } else if (row === "A" && (num === 1 || num === aud.seatsPerRow)) {
          seatType = "WHEELCHAIR";
          priceMultiplier = 100;
        }

        const [insertedSeat] = await db
          .insert(seats)
          .values({
            auditoriumId: audId,
            rowLabel: row,
            seatNumber: num,
            seatType,
            priceMultiplier,
          })
          .onConflictDoNothing()
          .returning();

        if (insertedSeat) {
          currentSeatIds.push(insertedSeat.id);
        }
      }
    }

    if (currentSeatIds.length === 0) {
      const existingSeats = await db.select().from(seats).where(eq(seats.auditoriumId, audId));
      for (const s of existingSeats) currentSeatIds.push(s.id);
    }

    createdAuditoriums.push({
      id: audId,
      seatIds: currentSeatIds,
      screenType: aud.screenType,
    });
  }

  // 5. Create Movies
  console.log("🎞️ Seeding movies...");
  const moviesData = [
    {
      title: "Dune: Part Two",
      slug: "dune-part-two",
      description:
        "Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family. Facing a choice between the love of his life and the fate of the known universe, he endeavors to prevent a terrible future only he can foresee.",
      posterUrl: "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=600&q=80",
      backdropUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1600&q=80",
      trailerUrl: "https://www.youtube.com/watch?v=Way9Dexny3w",
      durationMins: 166,
      releaseDate: new Date("2024-03-01T00:00:00Z"),
      language: "English",
      rating: "PG-13",
      isFeatured: true,
      genreSlugs: ["sci-fi", "adventure", "action"],
    },
    {
      title: "Oppenheimer",
      slug: "oppenheimer",
      description:
        "The story of American scientist J. Robert Oppenheimer and his role in the development of the atomic bomb during World War II.",
      posterUrl: "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?auto=format&fit=crop&w=600&q=80",
      backdropUrl: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1600&q=80",
      trailerUrl: "https://www.youtube.com/watch?v=uYPbbksJxIg",
      durationMins: 180,
      releaseDate: new Date("2023-07-21T00:00:00Z"),
      language: "English",
      rating: "R",
      isFeatured: true,
      genreSlugs: ["drama", "thriller"],
    },
    {
      title: "Interstellar: Beyond Time",
      slug: "interstellar-beyond-time",
      description:
        "When Earth becomes uninhabitable in the future, a farmer and ex-NASA pilot, Joseph Cooper, is tasked to pilot a spacecraft, along with a team of researchers, to find a new planet for humans.",
      posterUrl: "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=600&q=80",
      backdropUrl: "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&w=1600&q=80",
      trailerUrl: "https://www.youtube.com/watch?v=zSWdZVtXT7E",
      durationMins: 169,
      releaseDate: new Date("2024-05-15T00:00:00Z"),
      language: "English",
      rating: "PG-13",
      isFeatured: true,
      genreSlugs: ["sci-fi", "drama", "adventure"],
    },
    {
      title: "Cyberpunk: Neon Horizon",
      slug: "cyberpunk-neon-horizon",
      description:
        "In a rain-drenched megacity of 2084, a rogue neural detective uncovers a syndicate synthesizing artificial human souls for the corporate elite.",
      posterUrl: "https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=600&q=80",
      backdropUrl: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1600&q=80",
      trailerUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      durationMins: 138,
      releaseDate: new Date("2024-09-20T00:00:00Z"),
      language: "English",
      rating: "R",
      isFeatured: false,
      genreSlugs: ["sci-fi", "action", "thriller"],
    },
    {
      title: "Spirited Chronicle",
      slug: "spirited-chronicle",
      description:
        "A young cartographer discovers an ethereal archipelago floating above the clouds inhabited by mythical spirits and forgotten celestial beings.",
      posterUrl: "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=600&q=80",
      backdropUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1600&q=80",
      trailerUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      durationMins: 114,
      releaseDate: new Date("2024-08-10T00:00:00Z"),
      language: "Japanese",
      rating: "PG",
      isFeatured: false,
      genreSlugs: ["animation", "adventure"],
    },
  ];

  const createdMovies: { id: string; title: string }[] = [];

  for (const m of moviesData) {
    const { genreSlugs, ...movieFields } = m;
    const [inserted] = await db
      .insert(movies)
      .values(movieFields)
      .onConflictDoNothing()
      .returning();

    let movieId = inserted?.id;
    if (!movieId) {
      const existing = await db.select().from(movies).where(eq(movies.slug, m.slug)).limit(1);
      if (existing.length) movieId = existing[0].id;
    }

    if (movieId) {
      createdMovies.push({ id: movieId, title: m.title });
      for (const slug of genreSlugs) {
        const genreId = insertedGenres[slug];
        if (genreId) {
          await db
            .insert(movieGenres)
            .values({ movieId, genreId })
            .onConflictDoNothing();
        }
      }
    }
  }

  // 6. Create Showtimes and Showtime Seats
  console.log("⏱️ Seeding showtimes and showtime seats...");
  const basePrices = [1450, 1850, 2200]; // in cents ($14.50, $18.50, $22.00)

  // Generate showtimes for today, tomorrow, and the next 3 days
  const today = new Date();
  today.setHours(12, 0, 0, 0);

  for (let dayOffset = 0; dayOffset < 3; dayOffset++) {
    for (let i = 0; i < createdMovies.length; i++) {
      const movie = createdMovies[i];
      const aud = createdAuditoriums[i % createdAuditoriums.length];
      if (!aud) continue;

      // Create 2 showtimes per day for this movie (matinee and evening)
      const matineeStart = new Date(today.getTime() + dayOffset * 86400000 + 14 * 3600000); // 2:00 PM
      const matineeEnd = new Date(matineeStart.getTime() + 150 * 60000);

      const eveningStart = new Date(today.getTime() + dayOffset * 86400000 + 19 * 3600000); // 7:00 PM
      const eveningEnd = new Date(eveningStart.getTime() + 150 * 60000);

      const showtimeSlots = [
        { start: matineeStart, end: matineeEnd, price: basePrices[0], format: "2D" },
        { start: eveningStart, end: eveningEnd, price: basePrices[1], format: aud.screenType },
      ];

      for (const slot of showtimeSlots) {
        const [insertedShowtime] = await db
          .insert(showtimes)
          .values({
            movieId: movie.id,
            auditoriumId: aud.id,
            startTime: slot.start,
            endTime: slot.end,
            basePriceCents: slot.price,
            format: slot.format,
          })
          .onConflictDoNothing()
          .returning();

        if (insertedShowtime) {
          // Populate showtime_seats
          const seatRecords = await db
            .select()
            .from(seats)
            .where(eq(seats.auditoriumId, aud.id));

          let seatIndex = 0;
          for (const s of seatRecords) {
            const calculatedPrice = Math.round((slot.price * s.priceMultiplier) / 100);
            
            // Randomize a couple of booked seats to make the seat map feel real
            let initialStatus = "AVAILABLE";
            if (seatIndex === 3 || seatIndex === 4) {
              initialStatus = "BOOKED";
            } else if (seatIndex === 15) {
              initialStatus = "BLOCKED";
            }

            await db
              .insert(showtimeSeats)
              .values({
                showtimeId: insertedShowtime.id,
                seatId: s.id,
                status: initialStatus,
                priceCents: calculatedPrice,
              })
              .onConflictDoNothing();

            seatIndex++;
          }
        }
      }
    }
  }

  // Audit Log
  await db.insert(auditLogs).values({
    userId: adminUser?.id || null,
    action: "SYSTEM_SEEDED",
    entityType: "SYSTEM",
    entityId: "INIT",
    details: {
      message: "Database successfully seeded with movies, cinemas, auditoriums, and showtimes",
    },
  });

  console.log("✅ [CineBook Seed] Seeding completed successfully!");
}

// Run directly if called from CLI
if (require.main === module) {
  runSeed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("❌ Seeding failed:", err);
      process.exit(1);
    });
}
