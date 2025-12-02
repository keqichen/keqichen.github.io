---
author: Keqi Chen
pubDatetime: 2025-11-30T21:40:00Z
modDatetime: 2025-11-30T21:40:00Z
title: How Hash Tables Work (and Why JS Developers Should Care)
slug: hashtable-and-javascript
featured: true
draft: false
tags:
  - CS fundamentals
  - JavaScript/TypeScript
description:
  This post provides a foundational guide to hash tables, explaining what they are, why they’re fast, how collisions and load factor shape performance, and why every JavaScript developer should care.
---

## Table of contents

## What is a Hash Table?

A hash table is a data structure that stores key–value pairs and provides very fast **lookups, insertions, and deletions** — typically in O(1) average time.

It works by using a **hash function** to convert a key (like `apple` or `user_42`) into an array index. Once you know the index, you can jump directly to the stored value without scanning the entire collection.

Think of it as a super-efficient 'dictionary' where you can instantly look up what you want.

## Properties of a Good Hash Function
A good hash function is essential to making hash tables fast and reliable. A hash function should:

### 1. Be Deterministic

The same input must always produce the same output.

### 2. Distribute Keys Evenly

Keys should spread across the array to minimise collisions (when two keys hash to the same index).

### 3. Be Fast to Compute

Hashing is done on every read/write, so performance matters.

### 4. Avoid Patterns

Keys like "ab" and "ba" should not produce obviously related results.

### 5. Produce Values Within Array Range

Typically 0 … array_length - 1.

## What is load factor?

Load factor is a key concept in hash tables. In short:

```ts
Load factor = number of stored elements ÷ size of the hash table’s bucket array.
```

Here is a very intuitive way to think about it: 

Imagine 100 parking spaces (buckets), and you've parked 75 cars (entries). In this case, the load factor would be: 

```ts
Load factor = 75 / 100 = 0.75
```

Setting a proper load factor is essential because it maintains the balance between **performance** and **memory efficiency** in a hash table. In short, a low load factor prioritises *speed* over *memory*, while a high load factor prioritises *memory* over *speed*. Most languages choose ~0.7 because it offers the best balance.

When the load factor is low (for example, around 0.3), most buckets are empty, collisions are rare, and lookups or inserts run in close to constant time. As the load factor increases past roughly 0.7, more keys begin to compete for the same buckets, collisions become frequent, and operations can gradually degrade toward linear time. To prevent this slowdown, modern hash table implementations use a **maximum load-factor threshold** — typically around 0.66 to 0.75 in languages like Java, Python, and Go. 

Once the load factor exceeds this threshold, the table automatically grows: the underlying bucket array is expanded, and all existing keys are rehashed into their new positions. This **resizing** process is computationally expensive, so it’s triggered only when necessary, but it ensures the hash table remains fast and responsive even as data grows.

## What are Hash Collisions?
A hash collision happens when two different keys produce the same hash value.

**Example (Conceptually):**

Suppose your hash table has size 10:

``` ts
hash("cat")  → 3
hash("sun")  → 7
hash("car")  → 3   // collision with "cat"
```

The keys "cat" and "car" are different, but the hash function mapped them both to index 3, causing a collision.

Because the array position cannot hold two separate entries at once, the hash table must apply a collision-handling strategy to store them both safely. Notice that collisions are unavoidable because:

**- Finite storage vs infinite input**: The array has limited size, but keys are potentially unbounded.

**- Hash functions are not perfect**: Even well-designed functions will occasionally map different inputs to the same output.

**- High load factor**: As the table fills up, the probability of collisions increases.

A well-designed hash table expects collisions and includes efficient strategies to deal with them. The key point is not to eliminate collisions entirely (impossible), but to handle them efficiently so performance remains close to O(1) on average.

## How to Avoid Collisions

### 1. Separate Chaining

Each array index stores a linked list or bucket of entries.

``` ts
Index 3 -> [("dog", 1)] → [("apple", 5)] → [("book", 9)]
```

Insertions go at the end of the bucket.

**Pros:**

* Simple

* Handles high load factors well

**Cons:**

* Extra memory for pointers

* Worst-case lookup becomes O(n)

### 2. Open Addressing

In open addressing, all keys must be stored directly in the main array, so when a bucket is occupied, the table searches for another empty slot using a probing strategy. 

The most common variants are **linear probing** (checking index+1, index+2, and so on), **quadratic probing**, and **double hashing**, each of which defines a different pattern for finding the next available position during a collision.

**Pros:**

* Good cache performance

* No extra memory allocations

**Cons:**

* Must resize earlier

* Clustering can become a problem

## Why should a JavaScript developer care about hash tables?
Even though you rarely implement a hash table by hand in JavaScript, you use them every single day. 

Here’s why this matters:

### 1. Objects, Sets and Maps are hash tables

`Object`, `Set` and `Map` rely on hash-table–like structures under the hood, which means the performance characteristics of your everyday code are directly shaped by how hash tables behave.

For example, when you do:

``` ts
user.name
map.get("sessionId")
```

you’re relying on hash-table lookups. Understanding collisions, load factor, and resizing helps you reason about why these operations are fast, when they might slow down, and what happens as your data grows.

### 2. React memoisation uses hashing concepts

Hooks like `useMemo` and `useCallback` store results in a cache keyed by stable dependencies. This is fundamentally a hashing problem:

* compute a key (dependencies array)

* store/retrieve from a lookup table

* keep the lookup O(1)

If keys collide or change too often, memoisation stops being useful — which is exactly why people misuse these hooks.

### 3. Normalising and caching API data (Apollo, React Query)

State-management libraries routinely use hash maps to index cache entries:

``` ts
key → result

query signature → cached data

object id → entity
```

If you’ve ever seen “stale cache”, “cache miss”, or “unexpected re-fetch”, you’ve run into hash-key design problems.

## Conclusion
Hash tables are one of the most important data structures in computer science. By using a fast and well-distributed hash function, they offer constant-time lookup and insertion. In JavaScript, Map and Object both rely on hash-table-like mechanisms, even though the hashing is abstracted away.

Understanding how collisions happen — and how to handle or avoid them — is key to designing efficient, robust systems.

## Useful Links
- [**MIT 6.006 — Hashing & Hash Tables (Lecture Notes)**](https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/ce9e94705b914598ce78a00a70a1f734_MIT6_006S20_lec4.pdf) 

- [**V8 Blog — Optimizing Hash Tables: Hiding the Hash Code**](https://v8.dev/blog/hash-code)

- [**Separate Chaining vs Open Addressing — GeeksforGeeks Overview**](https://www.geeksforgeeks.org/hashing-set-2-separate-chaining/)

- [**Load Factor in Hash Table**](https://hyperskill.org/learn/step/40135) 
