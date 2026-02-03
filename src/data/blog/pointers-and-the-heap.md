---
author: Keqi Chen
pubDatetime: 2026-02-01T21:40:00Z
modDatetime: 2026-02-01T21:40:00Z
title: C++ and UE5 (1) - why we need pointers
slug: why-we-need-pointers
featured: true
draft: false
tags:
  - CS fundamentals
  - C++
  - UE5
description:
  This post offers a practical introduction to pointers through the lens of Unreal Engine 5, breaking down stack vs heap memory, object persistence, and polymorphism, and showing why pointers are a core requirement for building performant, persistent game worlds.
---

This year, I’ve been spending my free time diving into Unreal Engine 5, which has meant getting up close and personal with C++. I started this series to document my journey and solidify what I’ve learned along the way. Coming from a Frontend Engineering background, pointers initially felt like an alien concept. In my daily work with JavaScript or TypeScript, the engine handles the 'where' and 'how' of data storage through automatic garbage collection.

But in the world of game development, performance is king. This article explores the fundamental curiosity: **Why do we actually need pointers?** By breaking down the relationship between the Stack and the Heap, we’ll see how pointers serve as the essential bridge that makes a dynamic, persistent game world possible.

## Table of contents

## Static Allocation vs Dynamic Allocation
To understand why we need pointers, we should first understand how memory allocation works. There are two ways of allocation - static and dynamic. The primary distinction is about **who manages the memory**, and **when the size is determined**.

### Static Allocation (The Stack)

Static allocation happens on the **Stack**. Think of the Stack like a stack of cafeteria trays. It is organized, fast, and follows a strict "Last-In, First-Out" (LIFO) rule.

- **How it works**: When you call a function, the compiler carves out a block of memory for all its variables. When the function finishes, that entire block is "popped" off and disappears.
- **The Constraint**: You must know the size at **compile time**. You can’t ask the stack for "an array of size $N$" if $N$ is provided by a user during execution.

### Dynamic Allocation (The Heap)
Dynamic allocation happens on the **Heap**. This is a large pool of memory available to your program **at runtime**. The Heap is a giant, unorganized warehouse. It’s much larger than the stack, but finding and managing space there takes more work.

- **How it works**: You use the `new` keyword to ask the operating system for a specific amount of memory at runtime. This memory stays reserved for you until you manually say "I'm done with this" using `delete`.

- **Flexibility**: This is where you put data when you don't know how big it will be (like a user-generated list) or when you need it to stay alive even after a function ends.

- **The Risk**: If you forget to free this memory, you get a **memory leak**.

## How dynamic allocation is used in `std::strings`

Unlike JS, which treats strings as immutable primitives, C++ sees a `std::string` as a sophisticated manager. To balance the speed of the Stack with the flexibility of the Heap, C++ splits the string into two distinct parts:

1. ### The Manager (The Stack)

On the stack, C++ allocates a fixed-size container object. This 'Manager' typically holds three key pieces of information:

- **The Pointer**: The memory address of where the actual text is hiding.

- **The Size**: Exactly how many characters are currently in the string.

- **The Capacity**: How much total space we have reserved on the heap before we need to ask for more.

Because these three pieces of data (a pointer and two integers) always take up the same number of bytes (usually 24 or 32 bytes), the compiler can safely allocate this part **statically** at compile time.

2. ### The Payload (The Heap)

The actual text (the sequence of characters) is stored separately on the heap.

- **Dynamic Growth**: Since the text can grow from 'Hello' to a 50-page essay during runtime, it requires dynamic allocation.

- **Indeterminable Size**: Because the compiler cannot predict how much a user might type into a text field, it cannot reserve this space on the stack. Instead, it requests space on the heap as needed.

## Pointers: The Bridge Between Two Worlds
A pointer in C++ is a very thinly-veiled abstraction for a memory location. A pointer is actually a combination of two things:

1. **The Address**
A memory address is a literal numeric index into your RAM. Think of the Heap as a giant array of bytes; the pointer is simply the index telling the Manager exactly where its Payload starts.

2. **The Type**
Every pointer knows what it is pointing to. A pointer doesn't just hold an address; it holds a Type. This tells the compiler: 'Start at this address, but interpret the next few bytes as a char, an int, or an Unreal Actor.'

If the Heap is a massive warehouse, the Pointer is the GPS coordinate written on a sticky note. The sticky note lives in your pocket (The Stack), but it gives you the power to find and manipulate a massive crate stored miles away (The Heap).

## Pointers in UE5

The good news is, in UE5, we almost never need to manually delete engine objects, and we almost never store them by value. Anything that derives from `UObject` (including AActor and UActorComponent) must be declared and stored as a `pointer`. This isn’t a stylistic choice — it’s required so Unreal can track the object’s identity, ownership, and lifetime. The engine allocates these objects on the heap, registers them with reflection and garbage collection, and expects all gameplay code to reference them via stable memory addresses.

Unreal relies on pointers to solve several core game-logic problems that stack allocation simply cannot handle.

1. **Object Persistence (The Spawning Problem)**

In games, objects are constantly being born and destroyed: enemies spawn, bullets exist for a few frames, pickups appear and disappear.

If you were to create an enemy using stack allocation inside a function, it would be destroyed the moment that function returns.

By using dynamic allocation and pointers, Unreal allows you to spawn an Actor on the heap and hand ownership over to the game world. The object persists across frames, levels, and systems, and you interact with it through its memory address.

```c++
// Without pointers, this enemy would disappear
// the moment the function ends.
AActor* NewEnemy = GetWorld() -> SpawnActor<AEnemy>(
    EnemyClass,
    SpawnLocation
);
```

The key idea: the world owns the Actor, not the function that spawned it.

2. **Polymorphism: 'One Interface, Many Shapes'**

Unreal code constantly operates on categories of objects rather than concrete types:

- Player characters

- Bosses

- NPCs

- Projectiles

These may all derive from `AActor`, but they can be wildly different internally. A Boss might have hundreds of variables, complex AI state, and multiple components. A Bird might have almost none.

You cannot store these objects directly by value in a fixed-size container — their sizes are incompatible.

Pointers solve this cleanly:

- Every pointer is the same size (8 bytes on 64-bit systems)

- A pointer to a base class (AActor*) can reference any derived type

- Arrays, maps, and systems can treat all Actors uniformly

This is what allows Unreal to keep heterogeneous objects in a single structure while still calling the correct overridden behavior at runtime.

3. **Shared Access (The Targeting Problem)**

Imagine a Boss monster being attacked by 50 soldiers.

You do not want:

- 50 copies of the Boss in memory

- 50 independent health values drifting out of sync

Instead, every soldier holds a pointer to the same Boss instance.

All of them reference the same memory address. When one soldier applies damage, it modifies the Boss’s health once, and every other system immediately observes the change because they’re all looking at the same object.

This shared-reference model is fundamental to:

- Targeting systems

- AI blackboards

- Combat resolution

- Multiplayer authority logic

Pointers are what make “one world, many observers” work.

4. **Avoiding the “Copy Tax”**

Game objects are enormous.

An AActor doesn’t just contain a few fields — it references:

- Meshes

- Collision data

- Transform hierarchies

- Physics state

- Animation instances

- Component graphs

Passing such an object by value means copying every byte of that data. Even if it happens rarely, a single accidental copy can cause a noticeable frame hitch.

Passing a pointer, on the other hand, means copying exactly 8 bytes.

## Conclusion
By separating where data lives (the Heap) from how we access it (via pointers on the Stack), C++ gives Unreal the tools it needs to manage lifetimes, enable polymorphism, share state across systems, and avoid catastrophic performance costs. UE5 builds an entire ownership and garbage-collection model on top of this foundation, which is why engine objects must be referenced as pointers and never manually deleted.


## Useful Links
- [**ICS 45C Spring 2022 Notes and Examples: Pointers and the Heap**](https://ics.uci.edu/~thornton/ics45c/Notes/PointersAndTheHeap/) 

- [**Memory management and garbage collection in Unreal engine**](https://mikelis.net/memory-management-garbage-collection-in-unreal-engine/)


