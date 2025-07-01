# Laravel Chorus – Real-Time Client Sync Package

**Laravel Chorus** enables seamless synchronization of specific database tables and columns to clients in real-time, using database triggers, Redis, Laravel Reverb, and IndexedDB on the frontend.

## Teck Stack Overview
- Laravel 12: Server-side framework
- ReactPHP: Asynchronous event handling
- Redis: Pub/Sub for real-time notifications
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
- Tracked fields include:
  - `table_name`
  - `record_id`
  - `operation` (create/update/delete)
  - `data` (JSON payload)
  - `user_id` (optional, for scoped sync)
  - `processed_at` (for deduplication)

### 2. Redis Pub/Sub Notification
- On insert into `harmonics`, a Redis event is published:
  ```php
  Redis::publish('chorus.harmonics', $harmonic->id);

## Repository Structure
- `./examples`: Laravel project example using Chorus
- `./packages`: Contains laravel-chorus package and other supporting packages
