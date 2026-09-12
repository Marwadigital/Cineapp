"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Search,
  Filter,
  Calendar,
  Clock,
  MapPin,
  Sparkles,
  Ticket,
  Play,
  Star,
  ChevronRight,
  Tv,
  Film,
} from "lucide-react";

export default function HomePage() {
  const [movies, setMovies] = useState<any[]>([]);
  const [cinemas, setCinemas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [searchTitle, setSearchTitle] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState("");
  const [selectedCinema, setSelectedCinema] = useState("");
  const [selectedDate, setSelectedDate] = useState("");

  const [activeHeroIndex, setActiveHeroIndex] = useState(0);

  // Fetch cinemas for filter dropdown
  useEffect(() => {
    fetch("/api/cinemas")
      .then((res) => res.json())
      .then((data) => {
        if (data.cinemas) setCinemas(data.cinemas);
      })
      .catch(console.error);
  }, []);

  // Fetch filtered movies
  const fetchFilteredMovies = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (searchTitle) params.append("title", searchTitle);
    if (selectedGenre) params.append("genre", selectedGenre);
    if (selectedLanguage) params.append("language", selectedLanguage);
    if (selectedCinema) params.append("cinemaId", selectedCinema);
    if (selectedDate) params.append("date", selectedDate);

    fetch(`/api/movies?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.movies) setMovies(data.movies);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchFilteredMovies();
  }, [selectedGenre, selectedLanguage, selectedCinema, selectedDate]);

  // Featured movies for hero carousel
  const featuredMovies = movies.filter((m) => m.is_featured);
  const currentHero = featuredMovies[activeHeroIndex] || movies[0];

  // Auto-rotate hero every 6 seconds
  useEffect(() => {
    if (featuredMovies.length <= 1) return;
    const interval = setInterval(() => {
      setActiveHeroIndex((prev) => (prev + 1) % featuredMovies.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [featuredMovies.length]);

  return (
    <div className="space-y-12 pb-24">
      {/* Hero Showcase Section */}
      {currentHero && (
        <section className="relative w-full h-[520px] sm:h-[580px] lg:h-[640px] overflow-hidden border-b border-white/10">
          {/* Background Image with Gradient Overlays */}
          <div
            className="absolute inset-0 bg-cover bg-center transition-all duration-1000 transform scale-105"
            style={{ backgroundImage: `url(${currentHero.backdrop_url || currentHero.poster_url})` }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-slate-950/30" />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/80 to-transparent" />
          </div>

          <div className="relative max-w-7xl mx-auto h-full px-4 sm:px-6 lg:px-8 flex flex-col justify-end pb-12 sm:pb-16">
            <div className="max-w-2xl space-y-4">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> Featured Premiere
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-xs font-semibold">
                  {currentHero.rating}
                </span>
                <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> {currentHero.duration_mins} mins
                </span>
              </div>

              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight">
                {currentHero.title}
              </h1>

              <p className="text-sm sm:text-base text-slate-300 line-clamp-3 leading-relaxed">
                {currentHero.description}
              </p>

              {/* Action buttons */}
              <div className="pt-2 flex flex-wrap items-center gap-4">
                <Link
                  href={`/movies/${currentHero.id}`}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold text-sm shadow-glow flex items-center gap-2 transform hover:-translate-y-0.5 transition-all"
                >
                  <Ticket className="w-4 h-4" /> Book Seats Now
                </Link>
                {currentHero.trailer_url && (
                  <a
                    href={currentHero.trailer_url}
                    target="_blank"
                    rel="noreferrer"
                    className="px-5 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-sm border border-white/20 backdrop-blur-md flex items-center gap-2 transition-all"
                  >
                    <Play className="w-4 h-4 text-amber-400 fill-amber-400" /> Watch Trailer
                  </a>
                )}
              </div>
            </div>

            {/* Carousel Indicators */}
            {featuredMovies.length > 1 && (
              <div className="absolute bottom-6 right-6 flex items-center gap-2">
                {featuredMovies.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveHeroIndex(idx)}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      idx === activeHeroIndex ? "w-8 bg-amber-400" : "w-2 bg-white/30 hover:bg-white/50"
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Main Content Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        {/* Search & Multi-Filter Header Bar */}
        <section className="glass-panel p-5 sm:p-6 rounded-2xl space-y-4 shadow-xl">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            <div className="flex-1 relative">
              <input
                type="text"
                value={searchTitle}
                onChange={(e) => setSearchTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fetchFilteredMovies()}
                placeholder="Search by movie title..."
                className="w-full bg-slate-900/90 text-white placeholder-slate-400 pl-10 pr-4 py-2.5 rounded-xl border border-white/10 focus:border-amber-400 focus:outline-none text-sm"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            </div>
            <button
              onClick={fetchFilteredMovies}
              className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 transition-all"
            >
              <Search className="w-4 h-4" /> Search
            </button>
          </div>

          {/* Filters Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-white/10">
            {/* Genre Filter */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Genre
              </label>
              <select
                value={selectedGenre}
                onChange={(e) => setSelectedGenre(e.target.value)}
                className="w-full bg-slate-900 text-slate-200 text-xs py-2 px-3 rounded-lg border border-white/10 focus:border-amber-400 focus:outline-none"
              >
                <option value="">All Genres</option>
                <option value="sci-fi">Sci-Fi</option>
                <option value="action">Action</option>
                <option value="adventure">Adventure</option>
                <option value="drama">Drama</option>
                <option value="thriller">Thriller</option>
                <option value="animation">Animation</option>
              </select>
            </div>

            {/* Language Filter */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Language
              </label>
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="w-full bg-slate-900 text-slate-200 text-xs py-2 px-3 rounded-lg border border-white/10 focus:border-amber-400 focus:outline-none"
              >
                <option value="">All Languages</option>
                <option value="English">English</option>
                <option value="Japanese">Japanese</option>
              </select>
            </div>

            {/* Cinema Filter */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Cinema
              </label>
              <select
                value={selectedCinema}
                onChange={(e) => setSelectedCinema(e.target.value)}
                className="w-full bg-slate-900 text-slate-200 text-xs py-2 px-3 rounded-lg border border-white/10 focus:border-amber-400 focus:outline-none"
              >
                <option value="">All Locations</option>
                {cinemas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Filter */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Date
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full bg-slate-900 text-slate-200 text-xs py-1.5 px-3 rounded-lg border border-white/10 focus:border-amber-400 focus:outline-none"
              />
            </div>
          </div>
        </section>

        {/* Now Showing Movie Grid */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                <Ticket className="w-6 h-6 text-amber-400" /> Now Showing
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Book tickets for the biggest blockbusters in IMAX, Dolby Atmos, and 3D
              </p>
            </div>
            <span className="text-xs font-semibold text-slate-400">
              {movies.length} {movies.length === 1 ? "Movie" : "Movies"} Available
            </span>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="rounded-2xl bg-slate-900/60 border border-white/5 h-[420px] animate-pulse"
                />
              ))}
            </div>
          ) : movies.length === 0 ? (
            <div className="glass-panel text-center py-16 px-4 rounded-2xl">
              <Film className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-white mb-1">No movies found</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
                Try adjusting your search query, genre, or date filter to view available showings.
              </p>
              <button
                onClick={() => {
                  setSearchTitle("");
                  setSelectedGenre("");
                  setSelectedLanguage("");
                  setSelectedCinema("");
                  setSelectedDate("");
                }}
                className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold text-white"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {movies.map((movie) => (
                <div
                  key={movie.id}
                  className="glass-card rounded-2xl overflow-hidden flex flex-col group"
                >
                  {/* Poster image */}
                  <div className="relative aspect-[2/3] w-full overflow-hidden bg-slate-900">
                    <img
                      src={movie.poster_url}
                      alt={movie.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                      <span className="px-2 py-0.5 rounded bg-black/70 backdrop-blur-md text-white text-[11px] font-bold border border-white/10">
                        {movie.rating}
                      </span>
                      {movie.is_featured && (
                        <span className="px-2 py-0.5 rounded bg-amber-500 text-slate-950 text-[11px] font-extrabold shadow-sm">
                          HOT
                        </span>
                      )}
                    </div>
                    <div className="absolute bottom-3 right-3 px-2 py-1 rounded bg-black/80 backdrop-blur-md text-amber-400 text-xs font-semibold flex items-center gap-1 border border-white/10">
                      <Clock className="w-3 h-3" /> {movie.duration_mins}m
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                      <div className="flex flex-wrap gap-1 mb-1.5">
                        {movie.genres?.slice(0, 2).map((g: any) => (
                          <span
                            key={g.slug || g.name}
                            className="text-[10px] font-medium text-cyan-400 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-800/40"
                          >
                            {g.name}
                          </span>
                        ))}
                      </div>
                      <h3 className="font-bold text-white text-base group-hover:text-amber-400 transition-colors line-clamp-1">
                        {movie.title}
                      </h3>
                      <p className="text-xs text-slate-400 line-clamp-2 mt-1">
                        {movie.description}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-white/5">
                      <Link
                        href={`/movies/${movie.id}`}
                        className="w-full py-2.5 rounded-xl bg-amber-400/10 hover:bg-amber-400 text-amber-300 hover:text-slate-950 font-bold text-xs border border-amber-400/30 flex items-center justify-center gap-1.5 transition-all"
                      >
                        <span>Select Showtimes & Seats</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Cinema Experience Showcase */}
        <section className="glass-panel rounded-3xl p-8 sm:p-12 border border-white/10 space-y-8 relative overflow-hidden">
          <div className="max-w-xl space-y-3 relative z-10">
            <span className="text-xs font-bold text-cyan-400 tracking-wider uppercase">
              Next-Gen Projection
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Crafted for Ultimate Cinema Immersion
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Every auditorium features precision acoustics, ultra-high dynamic range laser
              projectors, and custom luxury seating with multi-angle motorized recline.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
            <div className="p-5 rounded-2xl bg-slate-900/80 border border-white/10 space-y-2">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-black text-xs">
                IMAX
              </div>
              <h3 className="font-bold text-white text-sm">IMAX with Laser</h3>
              <p className="text-xs text-slate-400">
                Next-generation 4K dual laser projection system with sharper images and pristine contrast.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/80 border border-white/10 space-y-2">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center font-black text-xs">
                DOLBY
              </div>
              <h3 className="font-bold text-white text-sm">Dolby Atmos Audio</h3>
              <p className="text-xs text-slate-400">
                360-degree multidimensional sound that sweeps around you for realism that puts you inside the story.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/80 border border-white/10 space-y-2">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-black text-xs">
                VIP
              </div>
              <h3 className="font-bold text-white text-sm">VIP Luxe Dine-In</h3>
              <p className="text-xs text-slate-400">
                Gourmet chef-prepared dining served directly to your heated premium leather recliner.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
