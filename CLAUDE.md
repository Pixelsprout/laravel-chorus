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

# Mintlify documentation

## Working relationship
- You can push back on ideas-this can lead to better documentation. Cite sources and explain your reasoning when you do so
- ALWAYS ask for clarification rather than making assumptions
- NEVER lie, guess, or make up information

## Project context
- Format: MDX files with YAML frontmatter
- Config: docs.json for navigation, theme, settings
- Components: Mintlify components

## Content strategy
- Document just enough for user success - not too much, not too little
- Prioritize accuracy and usability of information
- Make content evergreen when possible
- Search for existing information before adding new content. Avoid duplication unless it is done for a strategic reason
- Check existing patterns for consistency
- Start by making the smallest reasonable changes

## docs.json

- Refer to the [docs.json schema](https://mintlify.com/docs.json) when building the docs.json file and site navigation

## Frontmatter requirements for pages
- title: Clear, descriptive page title
- description: Concise summary for SEO/navigation

## Writing standards
- Second-person voice ("you")
- Prerequisites at start of procedural content
- Test all code examples before publishing
- Match style and formatting of existing pages
- Include both basic and advanced use cases
- Language tags on all code blocks
- Alt text on all images
- Relative paths for internal links

## Git workflow
- NEVER use --no-verify when committing
- Ask how to handle uncommitted changes before starting
- Create a new branch when no clear branch exists for changes
- Commit frequently throughout development
- NEVER skip or disable pre-commit hooks

## Do not
- Skip frontmatter on any MDX file
- Use absolute URLs for internal links
- Include untested code examples
- Make assumptions - always ask for clarification

