# Laravel Chorus – Real-Time Client Sync Package

**Laravel Chorus** enables seamless synchronization of specific database tables and columns to clients in real-time, using database triggers, Redis, Laravel Reverb, and IndexedDB on the frontend.

## AI Guidelines
- When writing tests, use Pest and apply the (Arrange, Act, Assert) pattern to each test.
- Try to always use php `final` classes.
- When I ask you to create a pull request:
  1. Please check the git history on the current branch
  2. If all changes are commited create a PR using the GitHub cli `gh` into the `main` branch my default.

## Teck Stack Overview
- Laravel 12: Server-side framework
- Supports MySQL, PostgreSQL and SQLite databases
- PestPHP: Testing framework
- Laravel Reverb: For real-time client updates
- IndexedDB: Client-side storage for offline capabilities

## 🧩 Core Concepts

### Harmonics Trait
- Applied to Eloquent models.
- Defines which table and which columns should be synced to clients.

### Harmonics Table
- Central change-log table (`harmonics`) that records insert/update/delete events for models using the Harmonics trait.

## 🏗️ Server-Side Architecture

### 1. Writing to `harmonics` Table
- Database triggers OR Laravel model events (`creating`, `updating`, `deleting`) create entries in the `harmonics` table.

### 2. Broadcasting harmonics over websockets
- When harmonics are written, chorus will then broadcast the harmonic data over websockets. Each client receives the harmonics they are authorized to see.

## Repository Structure
- `./examples`: Laravel project example using Chorus
- `./packages`: Contains laravel-chorus package and other supporting packages

