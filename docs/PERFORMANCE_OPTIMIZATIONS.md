# CRS Data Loading – Performance Optimizations

This document describes the frontend optimizations implemented to reduce data loading delays on CRS pages (Claims, Claim Summary Month, Claim Summary Payer, Activities).

---

## Overview

| Page | Before | After |
|------|--------|-------|
| `/crs/claims` | ~5s load, sequential fetches | Cache-first, parallel fetch, chunked mapping |
| `/crs/claim-summary-month` | Same as above | Same optimizations |
| `/crs/claim-summary-payer` | Same as above | Same optimizations |
| `/crs/activities` | Sequential: activities → offices → clinicians | Parallel fetch, cache-first |

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         USER NAVIGATES TO CRS PAGE                                │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│  CACHE-FIRST CHECK                                                               │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                        │
│  │ ReportCache  │    │ GlobalCache  │    │ ActivityCache│                        │
│  │ (sessionStorage)│  │ (sessionStorage)│  │ (in-memory) │                        │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘                        │
│         │                   │                    │                                 │
│         └───────────────────┼────────────────────┘                                 │
│                             │                                                      │
│                    Cache HIT? ────► YES ──► Show data immediately (no API call)   │
│                             │                                                      │
│                            NO                                                      │
└─────────────────────────────┼─────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│  PARALLEL FETCH (Promise.all)                                                     │
│                                                                                   │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐                   │
│  │  GET /claims    │  │  GET /offices   │  │  GET /clinicians│                   │
│  │  (or activities)│  │                 │  │  (activities only)│                  │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘                   │
│           │                    │                    │                             │
│           └────────────────────┼────────────────────┘                             │
│                                │                                                  │
│                    All fetched in parallel (not sequential)                        │
└────────────────────────────────┼─────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│  CHUNKED MAPPING (Claims only)                                                   │
│  Prevents main thread blocking on low-end devices                                │
│                                                                                   │
│  Raw data ──► [Chunk 1: 120 items] ──► setTimeout(0) ──► [Chunk 2: 120 items]   │
│                     │                                    │                        │
│                     └────────────────────────────────────┘                        │
│                                    │                                              │
│                              Yield to main thread between chunks                  │
│  ──► ... ──► [Chunk N] ──► Mapped data ready                                     │
└─────────────────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│  CACHE WRITE                                                                     │
│  Store in sessionStorage / GlobalCache for next visit                            │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Implemented Optimizations

### 1. Cache-First (Stale-While-Revalidate)

- **Before:** Every request hit the API.
- **After:** Check cache first; if available, render immediately.

**Caches used:**

- **ReportCacheContext** – Mapped claims + KPI for reports.
- **GlobalCacheContext** – Raw API responses (claims, activities, offices, clinicians).
- **ActivityCacheContext** – In-memory activities.

### 2. Parallel Fetching

- **Before:** Sequential: claims → offices, or activities → offices → clinicians.
- **After:** All fetches run in parallel with `Promise.all()`.

| Page | Parallel fetches |
|------|------------------|
| CRSReport | `claims` + `offices` |
| ActivityList | `activities` + `offices` + `clinicians` |

### 3. Chunked Mapping (Claims)

- **Before:** Single `.map()` over all rows, blocking the main thread.
- **After:** Process in chunks of ~120 items with `setTimeout(0)` between chunks to keep the UI responsive.

**Files:** `src/utils/claimMapper.js`, `src/hooks/useSmartDataFetch.js`

### 4. `cachedFetch` for Claims

- **Before:** Raw `fetch` for claims.
- **After:** `cachedFetch` for claims, so responses are cached in GlobalCache (sessionStorage) like activities.

### 5. Cache-First Before Extraction

- **Before:** Extraction status could block showing cached data.
- **After:** Cache is shown first, regardless of extraction status.

---

## Data Flow

```
                    ┌─────────────────────────┐
                    │ User visits CRS page   │
                    └───────────┬────────────┘
                                │
                                ▼
                    ┌─────────────────────────┐
                    │ getCachedReport()       │
                    │ getCachedData(key)      │
                    └───────────┬────────────┘
                                │
              ┌─────────────────┴─────────────────┐
              │                                   │
              ▼                                   ▼
    ┌─────────────────┐                 ┌─────────────────┐
    │ Cache HIT        │                 │ Cache MISS      │
    │ Show data now   │                 │ Show skeleton   │
    └────────┬────────┘                 └────────┬────────┘
             │                                   │
             │                                   ▼
             │                         ┌─────────────────┐
             │                         │ Promise.all()   │
             │                         │ parallel fetch  │
             │                         └────────┬────────┘
             │                                   │
             │                                   ▼
             │                         ┌─────────────────┐
             │                         │ processInChunks │
             │                         │ (claims only)   │
             │                         └────────┬────────┘
             │                                   │
             └───────────────────────────────────┼─────────┐
                                                 │         │
                                                 ▼         ▼
                                        ┌─────────────────────────────────┐
                                        │ Update state + write to cache   │
                                        └─────────────────────────────────┘
```

---

## Files Touched

| File | Purpose |
|------|---------|
| `src/hooks/useSmartDataFetch.js` | `processInChunks()` for non-blocking mapping |
| `src/utils/claimMapper.js` | Per-item claim mapping and KPI computation |
| `src/pages/user/crs-report/CRSReport.jsx` | Cache-first, parallel fetch, chunked mapping |
| `src/pages/user/activities/ActivityList.jsx` | Parallel fetch, cache-first |

---

## Low-End Device Handling

- **Chunk size:** 120 items per chunk with `setTimeout(0)` between chunks.
- **No extra dependencies:** Uses existing utilities.
- **Pagination:** 500 items per page to limit DOM nodes.
- **Cache-first:** Repeat visits can show data from cache quickly.
