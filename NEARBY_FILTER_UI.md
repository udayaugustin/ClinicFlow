# Nearby Filter UI Design

## Visual Layout

### 1. Search Section (Before Toggle)
```
┌─────────────────────────────────────────────────────────────────┐
│  Find Healthcare Near You                                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌────────────────────────────────────┬─────────────────────┐   │
│  │ 🔍 Search doctors, hospitals...    │ [All Types      ▼] │   │
│  └────────────────────────────────────┴─────────────────────┘   │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### 2. Nearby Toggle Section (New Addition)
```
┌─────────────────────────────────────────────────────────────────┐
│  ╔═══════════════════════════════════════════════════════════╗ │
│  ║ 📍 Show Nearby Clinics Only                       [○――] ║ │  (Toggle OFF)
│  ║    Find clinics within 5-10 km of your location           ║ │
│  ╚═══════════════════════════════════════════════════════════╝ │
└─────────────────────────────────────────────────────────────────┘
```

### 3. When Toggle is ENABLED (Location Requesting)
```
┌─────────────────────────────────────────────────────────────────┐
│  ╔═══════════════════════════════════════════════════════════╗ │
│  ║ 📍 Show Nearby Clinics Only                       [―○○] ║ │  (Toggle ON)
│  ║    Find clinics within 5-10 km of your location           ║ │
│  ╚═══════════════════════════════════════════════════════════╝ │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ⏳ Getting your location...                            │   │  (Yellow)
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 4. When Location is GRANTED
```
┌─────────────────────────────────────────────────────────────────┐
│  ╔═══════════════════════════════════════════════════════════╗ │
│  ║ 📍 Show Nearby Clinics Only                       [―○○] ║ │
│  ║    Find clinics within 5-10 km of your location           ║ │
│  ╚═══════════════════════════════════════════════════════════╝ │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ ✅ Location detected • Found 5 clinics within 10 km  [±50m]││ (Green)
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

### 5. Clinic Cards with Distance Badges
```
┌────────────────────┬────────────────────┬────────────────────┐
│ ┌────────────────┐ │ ┌────────────────┐ │ ┌────────────────┐ │
│ │[Clinic Image]  │ │ │[Clinic Image]  │ │ │[Clinic Image]  │ │
│ │     [2.3 km]   │ │ │     [4.7 km]   │ │ │     [6.1 km]   │ │  (Green badge)
│ ├────────────────┤ │ ├────────────────┤ │ ├────────────────┤ │
│ │City Med Center │ │ │Community Health│ │ │Metro Hospital  │ │
│ │📍 123 Main St  │ │ │📍 456 Oak Ave  │ │ │📍 789 Pine Rd  │ │
│ │                │ │ │                │ │ │                │ │
│ │[View Doctors]  │ │ │[View Doctors]  │ │ │[View Doctors]  │ │
│ └────────────────┘ │ └────────────────┘ │ └────────────────┘ │
└────────────────────┴────────────────────┴────────────────────┘
```

### 6. Location Permission DENIED
```
┌─────────────────────────────────────────────────────────────────┐
│  ╔═══════════════════════════════════════════════════════════╗ │
│  ║ 📍 Show Nearby Clinics Only                       [―○○] ║ │
│  ║    Find clinics within 5-10 km of your location           ║ │
│  ╚═══════════════════════════════════════════════════════════╝ │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ ❌ Location access denied. Please enable location          ││ (Red)
│  │    permissions to use this feature.                         ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                   │
│  ┌───────────────────────────────────────────┐                  │
│  │                                             │                  │
│  │         📍                                  │                  │
│  │                                             │                  │
│  │     Unable to access your location          │                  │
│  │                                             │                  │
│  │     [ 📍 Try Again ]                        │                  │
│  │                                             │                  │
│  └───────────────────────────────────────────┘                  │
└─────────────────────────────────────────────────────────────────┘
```

### 7. No Clinics Found Nearby
```
┌─────────────────────────────────────────────────────────────────┐
│  ╔═══════════════════════════════════════════════════════════╗ │
│  ║ 📍 Show Nearby Clinics Only                       [―○○] ║ │
│  ║    Find clinics within 5-10 km of your location           ║ │
│  ╚═══════════════════════════════════════════════════════════╝ │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ ✅ Location detected • Found 0 clinics within 10 km        ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                   │
│  ┌───────────────────────────────────────────┐                  │
│  │                                             │                  │
│  │         🏥                                  │                  │
│  │                                             │                  │
│  │   No clinics found within 10 km of your    │                  │
│  │   location.                                 │                  │
│  │                                             │                  │
│  │   Try disabling the nearby filter to see   │                  │
│  │   all clinics.                              │                  │
│  │                                             │                  │
│  └───────────────────────────────────────────┘                  │
└─────────────────────────────────────────────────────────────────┘
```

## Color Scheme

### Toggle Box (Blue Theme)
- **Background**: `bg-blue-50` (Light blue)
- **Border**: `border-blue-200` (Medium blue)
- **Icon Color**: `text-blue-600` (Bright blue)
- **Text**: Default foreground color

### Status Messages

#### 1. Requesting Location (Yellow/Warning)
- **Background**: `bg-yellow-50`
- **Text**: `text-yellow-600`
- **Icon**: Spinning loader (⏳)

#### 2. Location Granted (Green/Success)
- **Background**: `bg-green-50`
- **Text**: `text-green-600`
- **Icon**: MapPin (📍)
- **Badge**: `bg-green-600 text-white` for distance on cards

#### 3. Location Denied/Error (Red/Danger)
- **Background**: `bg-red-50`
- **Text**: `text-red-600`
- **Icon**: MapPin or Alert

#### 4. Loading Nearby Clinics (Blue/Info)
- **Background**: `bg-blue-50`
- **Text**: `text-blue-600`
- **Icon**: Spinning loader

## Icons Used

- **Navigation** 📍 - Main location icon for toggle
- **MapPin** 📍 - Location status indicators
- **Loader2** ⏳ - Spinning animation during loading
- **Building2** 🏥 - Empty state when no clinics found
- **Search** 🔍 - Search input icon

## Interactive States

### Toggle Switch States
1. **OFF**: Gray background, circle on left
2. **ON**: Blue/primary background, circle on right
3. **Disabled**: Grayed out, not clickable

### Search Input States
- **Enabled**: Normal appearance
- **Disabled** (when nearby is ON): Grayed out, cursor not-allowed

### Select Dropdown States  
- **Enabled**: Normal appearance
- **Disabled** (when nearby is ON): Grayed out, cursor not-allowed

## Responsive Behavior

### Mobile (< 768px)
- Toggle box: Full width
- Search input: Full width stacked
- Select dropdown: Full width stacked
- Clinic cards: 1 column grid

### Tablet (768px - 1024px)
- Toggle box: Full width
- Search and dropdown: Side by side
- Clinic cards: 2 column grid

### Desktop (> 1024px)
- Toggle box: Full width
- Search and dropdown: Side by side
- Clinic cards: 3-4 column grid

## Accessibility Features

1. **Toggle Label**: Properly linked with `htmlFor` attribute
2. **Keyboard Navigation**: All elements are keyboard accessible
3. **Screen Reader Support**: 
   - Status messages announced
   - Distance badges readable
   - Icons have aria-labels
4. **Color Contrast**: All text meets WCAG AA standards
5. **Focus Indicators**: Visible focus rings on interactive elements

## Animation Effects

1. **Toggle Switch**: Smooth transition when switched
2. **Loader Icons**: Continuous spin animation
3. **Status Messages**: Fade in/out transitions
4. **Clinic Cards**: Subtle hover elevation effect
5. **Distance Badges**: Positioned with smooth positioning
