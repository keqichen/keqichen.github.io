---
author: Keqi Chen
pubDatetime: 2025-09-20T00:40:00Z
modDatetime: 2025-09-20T00:40:00Z
title: "Why Big-O Alone Can't Explain Frontend (But You Should Still Learn It)"
slug: big-o-in-frontend
featured: true
# draft: false
tags:
  - ReactJs
  - Algorithm
description:
  This post explores why Big-O complexity alone fails to predict real-world frontend performance, yet understanding CS fundamentals remains valuable.
---

I often hear: **“Why are we doing LeetCode in a frontend interview?”** It’s a fair gripe — some questions do feel out of step with modern frontend work. And here's a controversial take: **Big-O analysis alone often fails to predict what actually works in frontend development.**

Consider two simple examples: 

- **Example one**: Linked lists have O(1) prepend while arrays have O(n). Yet arrays completely dominate React development. Why? You can blame JS is a weird language, but it also shows Big-O doesn't capture engine optimisations, ecosystem support, or developer ergonomics.

- **Example two**:  `Set.prototype.has` is `O(1)` and `Array.prototype.includes` is `O(n)`; however, we should use the latter for a tiny list or a single check, as the one-time cost of building `new Set(...)` can outweigh any benefit. Big-O ignores constants and lower-order terms, but they become important at **small or moderate** input sizes, which, however, is a common use case in frontend. 

But this doesn't mean we should toss algorithms and data structures entirely. Understanding these fundamentals — even their limitations — helps recognise patterns, debug performance issues, and understand what's happening under the hood of the tools we use daily.

In this post, I'll use the array vs linked list comparison as a case study to demonstrate both the limits of pure Big-O thinking and why these CS fundamentals still strengthen your frontend practice.

## Table of contents

## What is Big-O complexity?
**Short version:** 

`Big-O` is a mathematical way to describe how an algorithm's resource use grows as input size grows. 

<details class="mt-4">
  <summary><strong>Toggle to see the long version</strong></summary>
  <ul>
    <li><strong>Big-O</strong> describes an algorithm’s <em>worst-case</em> time or space cost by providing an
        <em>asymptotic upper bound</em> on its growth rate.</li>
     <li>The focus is how cost scales as the input size <em>n</em> grows without bound (i.e. <code>n -> infinity</code>).</li>
    <li>Constants and lower-order terms are ignored because the highest-order term dominates as the
        input grows. For example, if number of operations for the algorithm <code>T(n)</code> is <code>n^2 + n + 1000</code>. When <code>n = 10,000</code>,
        then <code>n^2 = 100,000,000</code>, <code>n = 10,000</code>, and the constant is
        <code>1,000</code>. The linear part is ≈ <code>0.01%</code> of the total and the constant is
        ≈ <code>0.001%</code>, so the Big-O is <code>O(n^2)</code>.</li>
    <li>Here <em>n</em> denotes input size (e.g., array length; string length; for trees, number of
        nodes; for graphs, often written as <em>V</em> for vertices and <em>E</em> for edges).</li>
  </ul>
</details>

Don't worry if you don't understand what **asymptotic upper bound** is — that precision isn’t needed day to day. But as a software engineer, the practical question we do care about everyday is: **how does the cost scale as the input grows?**

From there, the meaning of time and space complexity are straightforward:

- `Time complexity`: how the number of operations (and thus runtime) grows with input size. 
- `Space complexity`: how the extra memory required grows with input size.

This post focuses on time complexity because performance is the usual pain in large-scale apps.

## Array vs Linked List: A Case Study in Frontend Trade-offs
 Let's dive deeper into these two data structures: `arrays` vs `linked lists`. 
 
 I chose this comparison deliberately — `arrays` because they're the backbone of React development (from state management to rendering lists); `linked lists` because they're the foundational building block for more complex data structures like `trees` and `graphs` that power our tools (React Fiber's work queue, AST traversal in bundlers, dependency graphs). Understanding this fundamental comparison helps us grasp why our ecosystem evolved the way it did.

Every JS developer should be very familiar with Array.

- **Array**: an indexed, ordered collection. Conceptually, it has contiguous memory, allowing better cache locality and CPU performance. Array is `object` in JS, meaning it is stored as `reference`. 

JavaScript doesn't provide a built-in linked list, but they're easy to model with objects:

- **Linked List**: a chain of `nodes`; each `node` stores a value and `pointers` to neighbors. A linked list does not have indexing - must walk from head to reach any element. But no need to shift indices like arrays sometimes do.

```ts
// Simple linked list node
const node = {
  value: 1,
  next: { value: 2, next: { value: 3, next: null } }
};
```

## Big-O of common JS array methods vs Linked lists
### 1) Index access
Arrays are indexed collections, so indexed access is constant time.

```ts
const array = [1, 2, 3];
return array[0]; // O(1)
```

The above operation is O(1) as the number of operation doesn’t grow with the array length - it’s always a direct lookup by index.

In a linked list, accessing by index would be O(n) — you'd have to traverse from the head.

### 2) End operations:`push`/`pop` - amortised O(1)

Appending/removing at the end of an array is O(1) as it only touches the last slot and increase the array length; existing indices are unaffected.

```ts
const a = [1, 2, 3];

a.push(4); // append at end → amortised O(1)
a.pop();   // remove last    → O(1)
```
*Why amortised? When capacity is full, the engine grows the backing store and copies elements once; spread over many appends, the average runtime per push stays constant.*

By contrast, in a linked list, appending is O(n) unless you maintain a tail pointer (then it's O(1)).


### 3) Front operations:`unshift`/`shift` - O(n)

Prepending/removing at the start of an array is O(n) as it requires shifting *every* element’s index by 1, so the number of operations will grow linearly with array length.

```ts
const a = [1, 2, 3];

a.unshift(0); // insert at front → O(n) (shift items right)
a.shift();    // remove front     → O(n) (shift items left)
```

Conceptually, `unshift(x)` operates the following:

```ts
for (let i = a.length - 1; i >= 0; i--) {
  a[i + 1] = a[i]; // move each element right
}
a[0] = x;
```

**Here's where linked lists theoretically shine**: prepending is O(1) — update the new node's next to the old head and reset the head pointer. Removing the head is also O(1) in a linked list.

## When Big-O Theory Meets Frontend Reality
Linked lists are great when you constantly insert/remove in the middle or at the head. But in real-world React, arrays win almost every time. Why?

- **JS + engine support**. JS has first-class arrays, no native linked list. Plus, engines (V8, SpiderMondy, JSCore) apply deep and mature optimisations to arrays. You don't need custom nodes or pointers.
- **Ergonomics for immutable updates**. React favors immutable operations, and JS provides elegant syntax for creating new arrays from existing ones, which is exactly what React needs for its change detection.

```ts
// Arrays - clean immutable operations
const newArray = [...oldArray, newItem];              // append
const newArray = oldArray.filter(item => item.id !== targetId); // remove
const newArray = oldArray.map(item => ({ ...item, updated: true })); // update
const newArray = [...oldArray.slice(0, index), newItem, ...oldArray.slice(index)]; // insert
```

With linked lists, you'd need to write custom recursive functions for every operation, making the code harder to read and maintain.

```ts
function immutablePrepend(linkedList, value) {
  return { value, next: linkedList }; // OK for prepend
}

function immutableRemove(linkedList, target) {
  // Much more complex - need to rebuild the chain
  if (!linkedList) return null;
  if (linkedList.value === target) return linkedList.next;
  return {
    value: linkedList.value,
    next: immutableRemove(linkedList.next, target)
  };
}
```
- **Built-in array methods are perfect for React's functional style**. Most UI transforms are` map/filter/sort` → `render`. Arrays excel at these functional transformations. Linked lists would need to be converted to arrays for rendering anyway.
- **Typical UI workloads**. We usually append/remove at the end (amortized O(1)), scan to render (O(n)), occasionally sort (O(n log n)). Frequent head/middle insertions at scale are rare; when lists are huge (10k+), we solve rendering cost with `virtualization`/`pagination`, not with a different in-memory structure.

In summary, the ecosystem, tooling, and patterns all assume array-based data, making linked lists an unnecessary complexity for 99.9% of React applications. The declarative nature of React means you describe what to render, not how to manipulate the underlying data structure—and arrays excel at this.

## Beyond Arrays: Why CS Fundamentals Still Matter
So, why do we still need to learn data structures, algorithm, and Big-O? 

### 1) Data structures
Even if you never implement them, recognizing these patterns helps you understand your tools:
- **Trees**: React's component tree, virtual DOM, ASTs in bundlers/compilers)
- **Graphs**: Dependency graphs in webpack, state machines, React Router's route trees)
- **Queues**: Event loop, React's update queue, priority scheduling in React Fiber
- **Linked lists**: React Fiber's work loop actually uses a linked list internally!

<details>
<summary><strong>Toggle here to see a solid example for React-hook-form if you are not convinced</strong></summary>

- `React Fiber` (React 16+) rebuilt React's internals to make updates interruptible and prioritisable. This impacts form libraries significantly: `React Hook Form` works with `Fiber` by letting each input manage itself independently — typing in one field only updates that field. 
- `Final Form` follows older patterns where all form state flows through a central point — typing in one field can trigger updates across the entire form. In a 50-field form, React Hook Form might re-render 1 component per keystroke while Final Form re-renders all 50.
</details>

### 2) Making Better Trade-offs
Sometimes it isn't about implementing these algorithms yourself, but recognizing the patterns to debug issues, evaluate libraries, and optimise strategically.

For example, knowing when Set's O(1) lookup justifies its creation overhead, spotting O(n²) performance issues from nested loops in components, understanding why `Immutable.js` chose trees over arrays internally, or recognizing when `virtualisation` beats `algorithmic optimization`. 

## Conclusion
The question isn't whether to learn CS fundamentals for frontend development — it's how to apply them wisely. Big-O notation and data structures aren't prescriptive rules but rather tools for understanding trade-offs.

Our `array` vs `linked list` comparison demonstrates this perfectly: arrays 'lose' in Big-O analysis for certain operations but win in practice due to factors that complexity analysis doesn't capture. Yet understanding both the theory and its limitations makes you a stronger engineer.

Think of CS fundamentals like learning music theory — you might play guitar using tabs without knowing theory, but understanding theory makes you a more versatile musician who can improvise, compose, and understand why certain patterns work. Similarly, these fundamentals teach you the 'why' behind the tools you use daily, even when you choose to work against theoretical optimality.

The best frontend engineers aren't those who blindly apply Big-O analysis, nor those who ignore it entirely. They're the ones who understand both the theory and the practical constraints, and know when each one should guide their decisions.

## Useful Links
- [FrontMaster: The last algorithms course you'll need](https://frontendmasters.com/courses/algorithms/)
- [Big-O Cheat Sheet](https://www.bigocheatsheet.com/)
- [JavaScript Array Methods Complexity](https://dev.to/lukocastillo/time-complexity-big-0-for-javascript-array-methods-and-examples-mlg)
- [React Fiber Architecture](https://github.com/acdlite/react-fiber-architecture)
- [V8 Array Optimizations](https://v8.dev/blog/elements-kinds)