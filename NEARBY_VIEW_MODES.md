# Nearby Search - View Modes

## Overview
The nearby search feature now has **two display modes** that automatically switch based on whether the user is searching or browsing.

---

## View Mode 1: Card Grid (Default - No Search)

**When:** Nearby mode is ON, but **no search term** entered

**Display:** Grid of clinic cards with images

```
┌─────────────────────────────────────────────────────────────┐
│ Location detected • Found 12 clinics within 10 km           │
└─────────────────────────────────────────────────────────────┘

┌────────────┬────────────┬────────────┬────────────┐
│ [Image]    │ [Image]    │ [Image]    │ [Image]    │
│ [1.4 km]   │ [1.6 km]   │ [1.7 km]   │ [1.7 km]   │
│            │            │            │            │
│ Mother's   │ Madhavan   │ Teja       │ Mahalakshmi│
│ Specialty  │ Eye Care   │ Hospital   │ Hospital   │
│ Hospital   │            │            │            │
│            │            │            │            │
│[View Docs] │[View Docs] │[View Docs] │[View Docs] │
└────────────┴────────────┴────────────┴────────────┘
```

**Features:**
- ✅ Visual clinic images
- ✅ Distance badge on each card
- ✅ Clean, browsable grid layout
- ✅ Best for exploring all nearby options

---

## View Mode 2: Detailed List (Search Active)

**When:** Nearby mode is ON AND user types a **search term** (e.g., "ENT")

**Display:** List of clinics with specialty and doctor information

```
┌─────────────────────────────────────────────────────────────┐
│ Location detected • Found 5 clinics within 10 km matching   │
│ "ENT"                                                        │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 🏥 City Medical Center              0 doctors           ›   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 🩺 Teja Hospital                                         ›   │
│    🩺 ENT specialists  • 1 doctors  • 1.7 km away           │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 🩺 Mahalakshmi Hospital                                  ›   │
│    🩺 ENT specialists  • 1 doctors  • 1.7 km away           │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 🩺 Mother's Specialty Hospital                           ›   │
│    🩺 ENT specialists  • 1 doctors  • 1.4 km away           │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 🩺 ESSVEE Hospital                                       ›   │
│    🩺 ENT specialists  • 1 doctors  • [distance]            │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 🩺 Madhavan Eye Care                                     ›   │
│    🩺 ENT specialists  • 1 doctors  • 1.6 km away           │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 🩺 Clinic1                                               ›   │
│    🩺 ENT specialists  • 1 doctors  • [distance]            │
└─────────────────────────────────────────────────────────────┘
```

**Features:**
- ✅ Shows **specialty information** (e.g., "ENT specialists")
- ✅ Shows **number of matching doctors** (e.g., "1 doctors")
- ✅ Shows **distance badge** inline
- ✅ Compact list format for easy scanning
- ✅ Click any row to see full doctor details
- ✅ Perfect for specialty-focused searches

---

## Automatic View Switching

### Scenario 1: Start Browsing
```
User Action          Display Mode
─────────────────    ─────────────
1. Toggle ON         → Card Grid (all nearby clinics)
2. Browse clinics    → Card Grid (visual browsing)
```

### Scenario 2: Search for Specialty
```
User Action          Display Mode
─────────────────    ─────────────
1. Toggle ON         → Card Grid (all nearby clinics)
2. Type "ENT"        → LIST VIEW (shows ENT info)
3. Click hospital    → Navigate to details
```

### Scenario 3: Clear Search
```
User Action          Display Mode
─────────────────    ─────────────
1. List view active  → List (showing ENT results)
2. Clear search      → Card Grid (back to visual browse)
```

---

## List View Details

### Information Shown Per Clinic

```
┌─────────────────────────────────────────────────────────────┐
│ 🏥 [Clinic Icon] Hospital Name                           ›  │
│                                                              │
│    🩺 [Specialty Badge] • [Doctor Count] • [Distance]       │
└─────────────────────────────────────────────────────────────┘
```

**Components:**
1. **Clinic Icon** - Building icon in blue circle
2. **Hospital Name** - Bold, prominent text
3. **Specialty Badge** - Purple icon + text (e.g., "ENT specialists")
4. **Doctor Count** - Secondary badge (e.g., "1 doctors")
5. **Distance Badge** - Green badge (e.g., "1.7 km away")
6. **Chevron** - Right arrow for navigation

### When Multiple Specialties Match

If a clinic has multiple matching doctors with different specialties:

```
┌─────────────────────────────────────────────────────────────┐
│ 🩺 Apollo Hospital                                       ›   │
│    🩺 ENT, Cardiology specialists • 3 doctors • 2.1 km      │
└─────────────────────────────────────────────────────────────┘
```

### When Clinic Has No Matching Doctors

If clinic appears but has no doctors matching the search:

```
┌─────────────────────────────────────────────────────────────┐
│ 🏥 City Medical Center              0 doctors           ›   │
└─────────────────────────────────────────────────────────────┘
```
(This clinic matched by name/location, not by specialty)

---

## User Interactions

### In List View

| Action | Result |
|--------|--------|
| Click any clinic row | Navigate to clinic details page |
| Hover over row | Row highlights with shadow effect |
| Clear search box | Switch back to card grid view |
| Type different term | List updates with new matches |

### In Card Grid View

| Action | Result |
|--------|--------|
| Click "View Doctors" | Navigate to clinic details page |
| Start typing search | Switch to list view |
| Hover over card | Card elevates slightly |
| Scroll | Load more cards (if many results) |

---

## Responsive Behavior

### Mobile (< 768px)

**List View:**
- Full width rows
- Stack specialty info below hospital name
- Larger touch targets
- Distance badge wraps if needed

**Card View:**
- 1 column grid
- Larger cards for touch
- Distance badge prominent

### Tablet (768px - 1024px)

**List View:**
- Same as mobile, slightly wider rows
- More content per row

**Card View:**
- 2 column grid
- Medium-sized cards

### Desktop (> 1024px)

**List View:**
- Wide rows showing all info inline
- Compact, scannable format
- Hover effects

**Card View:**
- 3-4 column grid
- Full-sized images
- Hover elevate effects

---

## Code Logic

```typescript
{nearbyEnabled ? (
  filteredNearbyClinics.length === 0 ? (
    <EmptyState />
  ) : searchTerm.trim() ? (
    <ListView clinics={filteredNearbyClinics} />  // ← Shows list with specialty info
  ) : (
    <CardGridView clinics={filteredNearbyClinics} />  // ← Shows image cards
  )
) : (
  <DefaultAllClinicsView />
)}
```

**Decision Tree:**
1. Is nearby mode enabled?
   - No → Show all clinics
   - Yes → Continue...
2. Are there results?
   - No → Show empty state
   - Yes → Continue...
3. Is there a search term?
   - Yes → Show **LIST VIEW** with specialty details
   - No → Show **CARD GRID** with images

---

## Benefits of Dual View System

### List View Benefits
✅ Shows relevant information immediately (specialty, doctor count)  
✅ More compact - shows more results at once  
✅ Easier to scan when you know what you're looking for  
✅ Better for search-focused users  
✅ Displays distance inline with other info  

### Card Grid Benefits
✅ Visual representation with images  
✅ Better for browsing/exploration  
✅ More engaging and attractive  
✅ Easier to recognize familiar clinics  
✅ Better for users without specific needs  

---

## Examples by Use Case

### Use Case 1: "I need an ENT specialist nearby"
```
1. Toggle ON nearby
2. Type "ENT"
3. See LIST VIEW with:
   - All clinics with ENT doctors
   - How many ENT doctors each has
   - Distance to each clinic
4. Click to book appointment
```

### Use Case 2: "What clinics are near me?"
```
1. Toggle ON nearby
2. Don't search
3. See CARD GRID with:
   - Visual layout of all nearby clinics
   - Images to recognize familiar places
   - Distance badges
4. Browse and explore options
```

### Use Case 3: "Find Dr. Kumar nearby"
```
1. Toggle ON nearby
2. Type "Kumar"
3. See LIST VIEW with:
   - Only clinics where Dr. Kumar works
   - Dr. Kumar's specialty
   - Distance to those clinics
4. Click to see schedule
```

---

## Accessibility

### List View
- ✅ Keyboard navigable (Tab through rows)
- ✅ Enter key to select clinic
- ✅ Screen readers announce specialty and distance
- ✅ High contrast for specialty badges
- ✅ Clear focus indicators

### Card Grid View
- ✅ Grid maintains reading order
- ✅ Images have alt text
- ✅ Cards keyboard accessible
- ✅ Distance badges readable by screen readers

---

## Future Enhancements

1. **Toggle Button** - Let users manually switch between views
2. **Remember Preference** - Save user's preferred view in localStorage
3. **Sort Options** - Sort list by distance, rating, or doctor count
4. **Expand/Collapse** - Show doctor names inline in list view
5. **Map View** - Third view mode showing clinics on map
