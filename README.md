# Search Autocomplete System

A low-latency autocomplete service that generates ranked query suggestions from historical search data.

## Features
- Prefix-based suggestion retrieval
- Redis Sorted Sets for fast ranking
- PostgreSQL persistence for source and analytics data
- Express REST API
- Cache-first reads designed for concurrent traffic

## Architecture
The API accepts a query prefix, retrieves ranked candidates from Redis, and uses PostgreSQL as durable storage. Query popularity signals can update ranking scores asynchronously.

## Technology
Node.js, Express, Redis, PostgreSQL, Docker

## Run locally
1. Install the required services or use Docker.
2. Clone the repository and install dependencies with `npm install`.
3. Configure database and Redis environment variables.
4. Run `npm start`.

## Future improvements
Fuzzy matching, typo tolerance, personalized ranking, offline index rebuilding, performance benchmarks, automated tests, and observability.

## Author
Malasree Rallapalli
