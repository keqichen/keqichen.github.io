---
author: Keqi Chen
pubDatetime: 2026-05-08T21:40:00Z
modDatetime: 2026-05-08T21:40:00Z
title: "C++ and UE5 (2) - TWeakObjectPtr: Reference Objects Without Keeping Them Alive"
slug: usage-of-tweakobjectptr
featured: true
draft: false
tags:
  - CS fundamentals
  - C++
  - UE5
description:
  This article covers how UE5's GC works, what problem it can cause, and how `TWeakObjectPtr` solves it.
---

Managing object lifetimes is one of the trickiest parts of working with Unreal Engine in C++. Get it wrong and you're either leaking memory or crashing with dangling pointers. UE5's garbage collector (GC) is designed 
to handle this automatically — but it doesn't always behave the way your game logic intends.

In this article I'll cover how UE5's GC works, what problem it can cause, and how `TWeakObjectPtr` solves it.

## Table of contents

## What is UE5's Garbage Collector (GC)?

In raw C++, memory management is entirely a developer's responsibility — you allocate an object with `new` and free it with `delete`. Forgetting to delete it will cause a memory leak. UE5 takes a different approach by introducing a built-in Garbage Collector (GC) that handles this automatically.

Note that GC doesn't manage everything — it only tracks **UObjects**. A `UObject` is any class that inherits from UE5's base `UObject` class, which covers most gameplay objects you'll work with: Actors, Characters, Controllers, Components, and more.

GC periodically scans all `UObjects` and asks a simple question: *does anything hold a strong reference to this object?* If yes, it stays alive. If no, GC collects it and frees the memory.

## How does GC know what to keep alive?
GC recognises a strong reference through a macro called `UPROPERTY`. Any raw pointer marked with `UPROPERTY` is visible to GC's scan, telling it to keep that object alive. Without it, the pointer is invisible to GC and the object can be collected at any time without warning.

See this exmaple:

```cpp
UCLASS()
ARoomManager : public AActor
{
    UPROPERTY()
    AEnemy* EnemyA;  // GC sees this → keeps EnemyA alive as long as ARoomManager is alive

    AEnemy* EnemyB;  // GC does not see this → EnemyB can be collected at any time
}
```

The lifetime of the reference is tied to the class that declares it. As long as `ARoomManager` is alive and holds a `UPROPERTY` pointer to `EnemyA`, GC won't touch it. Once `ARoomManager` is destroyed (e.g. the level it lives in is unloaded), the reference is gone and GC is free to collect `EnemyA`.

This makes raw pointers without `UPROPERTY` particularly dangerous in UE5. Unlike raw C++ where a pointer stays valid until you explicitly delete it, in UE5 a pointer without `UPROPERTY` can become invalid at any moment — whenever GC decides to run its next scan. In the example above, accessing `EnemyB` after GC runs would result in a crash.

## The problem this creates

So GC sounds great — but it breaks down when you think about actual game logic.

Consider an AI controller tracking its current target:

```cpp
UCLASS()
AAIController : public AActor
{
    UPROPERTY()
    AEnemy* CurrentTarget;  // strong reference — GC keeps CurrentTarget alive
}
```

The enemy dies in game — health reaches zero, death animation plays, it should be gone. But `AAIController` is still alive and still holding a `UPROPERTY` reference to it. GC sees that reference and refuses to collect the enemy. The 
enemy is logically dead but physically still sitting in memory.

Now imagine this happening across an entire level — waves of enemies dying but never being cleaned up because various classes are holding `UPROPERTY` references to them. Dead enemies pile up in memory, and your game slowly leaks.

The root of the problem is that `UPROPERTY` couples the two objects' lifetimes together — it says "keep this alive as long as I'm alive." But `AAIController`'s lifetime has nothing to do with `AEnemy`'s lifetime. The enemy should die independently, not be kept alive because an AI happens to be watching it. Based on game logic, when an enemy's health hits zero, it should be collected by GC. `AAIController` should not be the reason it stays in memory.

Therefore, what we really need is a way to hold a reference *without blocking GC* — and that's exactly what `TWeakObjectPtr` is for.

## What is TWeakObjectPtr?

`TWeakObjectPtr` is a C++ template class that lets you hold a reference to a `UObject` without blocking GC. Unlike a `UPROPERTY` raw pointer, `TWeakObjectPtr` is invisible to GC's scan — so the object it points to can be collected freely based on game logic, not on whether someone is referencing it.

```cpp
TWeakObjectPtr<AEnemy> CurrentTarget;  // GC can collect CurrentTarget at any time
```

Instead of holding a raw pointer, `TWeakObjectPtr` stores two things internally: an index into GC's global object array, and a serial number assigned to the object when it was created. It doesn't talk to GC — it simply reads from it.

```cpp
// Simplified representation of what TWeakObjectPtr stores internally
struct TWeakObjectPtr
{
    int32 ObjectIndex;        // where is this object in GC's array?
    int32 ObjectSerialNumber; // is it still the same object?
}
```

When GC collects an object, it invalidates the serial number. When you call `IsValid()`, `TWeakObjectPtr` silently checks that serial number against GC's array:

```cpp
if (CurrentTarget.IsValid())
{
    // serial number matched — object still alive, safe to use
    CurrentTarget.Get() -> DoSomething();
}
// serial number invalidated — object was collected, IsValid() returns false
```

This is the key distinction from a `UPROPERTY` raw pointer:

- `UPROPERTY` → **talks to GC** → "keep this alive"
- `TWeakObjectPtr` → **reads from GC** → "is this still alive?"

One influences GC's decisions, the other silently observes them. That's how `TWeakObjectPtr` can track an object without preventing its collection — it is a silent observer of GC's internal state, not a participant in it.

## When should you use TWeakObjectPtr?

The decision is a game logic question first, not a C++ question. Before choosing your pointer type, ask yourself:

> Does my class need this object to exist, or is it just watching it?

If your class **needs** the object to function — like a character that owns its weapon — use a `UPROPERTY` raw pointer. The weapon should stay alive as long as the character is alive.

```cpp
UPROPERTY()
AWeapon* EquippedWeapon;  // character owns its weapon, lifetimes are coupled
```

If your class is just **observing** the object — like an AI watching its current target — use `TWeakObjectPtr`. The target has its own independent lifetime and should not be kept alive just because an AI is referencing it.

```cpp
TWeakObjectPtr<AEnemy> CurrentTarget;  // AI observes the target, does not own it
```

A simple rule of thumb: if the object you're referencing can be destroyed independently of your class, `TWeakObjectPtr` is the right choice. It lets you hold the reference you need without accidentally becoming the reason the object stays in memory.

## Best Practices

### 1. Always validate before use, but only once

Since `.IsValid()` and `.Get()` have almost identical implementations, calling both is wasteful — every call is a lookup into GC's object array. Instead of checking `.IsValid()` then calling `.Get()`, just use `.Get()` directly:

```cpp
// ❌ wasteful — checks validity twice
if (CurrentTarget.IsValid())
{
    AEnemy* Target = CurrentTarget.Get();
    ...
}

// ✅ correct — one lookup, null check is enough
if (AEnemy* Target = CurrentTarget.Get())
{
    ...
}
```

### 2. Dereference once, cache the result

Every use of `operator->` on a `TWeakObjectPtr` is a hidden dereference — a lookup into GC's array. Resolve it once upfront and cache the raw pointer:

```cpp
// ❌ wasteful — dereferences 3 times
if (CurrentTarget.IsValid())
{
    CurrentTarget->Foo();
    CurrentTarget->Bar();
}

// ✅ correct — one dereference, use cached pointer
if (AEnemy* Target = CurrentTarget.Get())
{
    Target->Foo();
    Target->Bar();
}
```

### 3. Avoid constructing TWeakObjectPtr repeatedly

Constructing a `TWeakObjectPtr` from a raw pointer has a cost. Avoid doing this inside a loop — construct it once outside:

```cpp
// ❌ wasteful — constructs TWeakObjectPtr on every iteration
for (TWeakObjectPtr<AEnemy>& WeakEnemy : EnemyArray)
{
    if (WeakEnemy == SomeEnemy) { ... }
}

// ✅ correct — construct once outside the loop
TWeakObjectPtr<AEnemy> SomeEnemyWeak = SomeEnemy;
for (TWeakObjectPtr<AEnemy>& WeakEnemy : EnemyArray)
{
    if (WeakEnemy == SomeEnemyWeak) { ... }
}
```

### 4. Use HasSameIndexAndSerialNumber() over operator==

`operator==` has a subtle performance cost — it calls `.IsValid()` on both pointers even when you already know they're valid. Use `.HasSameIndexAndSerialNumber()` instead when you know the object is valid:

```cpp
// ❌ unnecessary IsValid() checks inside operator==
if (WeakEnemy == KnownValidWeakEnemy) { ... }

// ✅ direct comparison, no hidden validity checks
if (WeakEnemy.HasSameIndexAndSerialNumber(KnownValidWeakEnemy)) { ... }
```

## Conclusion
`TWeakObjectPtr` is a small but important tool in UE5 C++ development. Once you understand that GC is built around recognising `UPROPERTY` references, the motivation for `TWeakObjectPtr` becomes clear.

The decision to use it is a game logic question first: does your class own this object, or is it just observing it? If the object has its own independent lifetime, `TWeakObjectPtr` is the right choice. It lets you express that 
non-owning relationship clearly in code, and ensures GC can collect objects when game logic dictates — not when your reference finally disappears. Without it, a single stale `UPROPERTY` reference is enough to keep a dead object in 
memory indefinitely.

That said, it does come with subtle overhead that's easy to overlook until you're deep in a profiling session. Following the best practices covered above — validating before access, dereferencing once, avoiding unnecessary 
construction — will ensure you get the most out of it.

## Useful Links
- [**Optimizing TWeakObjectPtr usage**](https://prosser.io/optimizing-tweakobjectptr-usage/) — A great deep dive into common inefficiencies when using `TWeakObjectPtr`, with practical tips on reducing unnecessary GC lookups and avoiding hidden overhead in hot code paths.

- [**TWeakObjectPtr API Reference**](https://docs.unrealengine.com/5.1/en-US/API/Runtime/Core/UObject/TWeakObjectPtr/) — The official Unreal Engine documentation covering the full API, including `IsValid()`, `Get()`, `HasSameIndexAndSerialNumber()`, and other methods discussed in this article.

- [**Unreal Engine Garbage Collection Overview**](https://docs.unrealengine.com/5.3/en-US/unreal-object-handling-in-unreal-engine/) — Official documentation on how UE5 handles UObject lifetime, UPROPERTY eferences, and the GC system that `TWeakObjectPtr` is built around.



