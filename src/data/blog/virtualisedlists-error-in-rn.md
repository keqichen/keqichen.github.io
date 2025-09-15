---
author: Keqi Chen
pubDatetime: 2025-09-15T21:40:00Z
modDatetime: 2025-09-15T21:40:00Z
title: Rethinking the 'VirtualizedLists should never be nested inside plain ScrollViews with the same orientation' Error in React Native
slug: virtualisedlists-error-in-react-native
featured: true
draft: false
tags:
  - ReactNative
description:
  The above warning is common in React Native. In this article, I'll examine the root cause, review common technical fixes, and explain when the best solution is redesigning your layout. 
---

The `VirtualizedLists should never be nested inside plain ScrollViews with the same orientation` error is common in React Native. There are several workarounds online, but some cases do require rethinking the layout. 

In this article, I'll examine the root cause, review common technical fixes, and explain when the best solution is redesigning your layout - such as placing FlatLists within non-scrollable containers like popups or modals rather than within scrollable parent views.

<!-- <figure>
  <img
    src="https://images.pexels.com/photos/159618/still-life-school-retro-ink-159618.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1"
    alt="Free Classic wooden desk with writing materials, vintage clock, and a leather bag. Stock Photo"
  />
    <figcaption class="text-center">
    Photo by <a href="https://www.pexels.com/photo/brown-wooden-desk-159618/">Pixabay</a>
  </figcaption>
</figure> -->

## Table of contents

## What is a VirtualizedList?
A **VirtualizedList** is an optimised list component that renders only what’s visible (a technique known as *virtualisation*/*windowing*). This keeps memory usage low and scrolling smooth for large datasets.

- `FlatList` and `SectionList` are both built on **VirtualizedList**.  
- `ScrollView` is a simple container that **renders all children at once**.

In practice, you’ll get far less delay for long lists with `FlatList`/`SectionList` than with `ScrollView`.

## When will you see this error?
This error fires when a **VirtualizedList** (`FlatList` / `SectionList`) is nested inside another scroller with the **same scroll direction** — typically a parent `ScrollView` or another `VirtualizedList`.  

Different orientations are fine (e.g., a **vertical** list whose items contain **horizontal** carousels).

## Why does this error occur?
When same-orientation scrollers are nested:

- **Gesture/scroll ownership conflicts:** The framework can’t reliably decide whether the **parent** or the **child** should handle scroll/touch events, causing flaky interactions or unresponsive UIs.  
- **Competing viewport maths:** Both containers attempt their own layout/visibility calculations, which can lead to jank, extra memory pressure, and rendering glitches.

## Common Technical Solutions

### 1) Suppress the warning (dev-only)
Use `LogBox.ignoreLogs()` (or legacy `YellowBox.ignoreWarnings()`) to hide the message.  
**Note:** This will just quiet dev console but **does not** fix the actual problem. I would not recommend this in prod.

```ts
// RN ≥ 0.63
import { LogBox } from 'react-native';
LogBox.ignoreLogs([
  'VirtualizedLists should never be nested inside plain ScrollViews with the same orientation',
]);

// RN < 0.63 (deprecated)
import { YellowBox } from 'react-native';
YellowBox.ignoreWarnings([
  'VirtualizedLists should never be nested inside plain ScrollViews with the same orientation',
]);
```

### 2) Enable nested scrolling
**Android:** You can sometimes get away with setting `nestedScrollEnabled` on **both** the parent and the child. But some edge cases might still be broken.

```ts
<ScrollView nestedScrollEnabled>
  <FlatList
    nestedScrollEnabled
    data={data}
    keyExtractor={(x) => x.id}
    renderItem={renderItem}
  />
</ScrollView>
```

**iOS:** This is unreliable for same-direction nesting. Two common tips you’ll see online are:

- **Set `scrollEnabled={false}` on the child** — this removes the warning but also removes the child’s ability to scroll (not useful).

- **Change the child’s scroll direction** — this avoids the conflict, but it changes the UX (might be fine if a horizontal carousel makes sense).

### 3) Refactor using `FlatList` / `SectionList` props (recommended)

Refactor the tab so there’s one vertical owner. Put “parent” UI in `ListHeaderComponent`/`ListFooterComponent`, and render any “nested” content inside items (ideally as **horizontal** carousels).  

This is the cleanest, most stable technical approach. But still, this pattern **does not** support two independent **vertical** scrollers on the same screen. 

<details>

<summary><strong>Toggle here to see an Example flow</strong></summary>

- Header (filters / actions) lives in `ListHeaderComponent`.
- “Complete” opens a **modal** (no background scroll).
- On confirm, we **push a banner** by toggling a **footer** (no extra scroller).
- Items can contain **horizontal** carousels.

```tsx
import React, { useState } from 'react';
import { FlatList, View, Text, Button, Modal } from 'react-native';

type Row = { id: string; photos: { id: string }[] };

export default function Screen({ data }: { data: Row[] }) {
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showBottomBanner, setShowBottomBanner] = useState(false);

  // Header: controls (tabs/filters + action)
  const Header = (
    <View>
      <Text>Filters / Tabs</Text>
      <Button title="Complete" onPress={() => setShowCompleteModal(true)} />
    </View>
  );

  // Footer: bottom banner (shown after confirm)
  const Footer = showBottomBanner ? (
    <View>
      <Text>Action applied</Text>
      <Text>Your changes have been saved.</Text>
    </View>
  ) : null;

  // Item: vertical list rows, each may contain a horizontal carousel
  const renderItem = ({ item }: { item: Row }) => (
    <View>
      <Text>Section {item.id}</Text>
      <FlatList
        horizontal
        data={item.photos}
        keyExtractor={(p) => p.id}
        renderItem={({ item: p }) => (
          <View>
            <Text>Photo {p.id}</Text>
          </View>
        )}
      />
    </View>
  );

  return (
    <>
      <FlatList
        data={data}
        keyExtractor={(x) => x.id}
        renderItem={renderItem}
        ListHeaderComponent={Header}   // header controls
        ListFooterComponent={Footer}   // bottom banner
        stickyHeaderIndices={[0]}      // keep header pinned
      />

      {/* Modal: confirm action, then show banner */}
      <Modal
        visible={showCompleteModal}
        transparent
        onRequestClose={() => setShowCompleteModal(false)}
      >
        <View>
          <Text>Confirm action?</Text>
          <Button
            title="Confirm"
            onPress={() => {
              setShowCompleteModal(false);
              setShowBottomBanner(true);
            }}
          />
          <Button title="Cancel" onPress={() => setShowCompleteModal(false)} />
        </View>
      </Modal>
    </>
  );
}
```
</details>

## Rethinking the UI/UX
Now if your UX truly needs nested vertical scrolling, what you need to do is to move the heavy scrolling UI into a **modal** or **bottom sheet** (popup):

![Scrolling feature](scrolling-feature.jpg)

This isolated gesture is common in production apps because it prevents nested-scroll issues and keeps the main screen simple.

## Conclusion
- If the interaction is complex or full-screen in feel (long lists, paginated results, pickers), use a dedicated **popup/bottom sheet**.
- If it belongs inline, let a single `FlatList` own vertical scrolling, and restructure around headers/footers rather than adding a parent `ScrollView`.

Design choices matter more than we often realise. Sometimes a small change to the interaction eliminates complex workarounds and delivers smoother performance. I came across this problem when working on a side project, and the important lesson I learnt as a developer is, the best 'performance optimisation' does not always lie in the clever code, but could just be a clearer flow.

## Useful References
- [React Native FlatList Documentation](https://reactnative.dev/docs/flatlist)
- [GitHub Issue #31697 - Discussion on VirtualizedList nesting](https://github.com/facebook/react-native/issues/31697#issuecomment-920142002)
- [Medium Article - Solving VirtualizedLists Nesting Error in React Native](https://medium.com/@sivasothytharsa17/solving-the-virtualizedlists-should-never-be-nested-inside-plain-scrollviews-error-in-react-fbd3cb4daeed)
