# Nearby Filter Feature

## Overview
A new "Nearby" toggle filter has been added to the patient dashboard that allows users to view only clinics within 5-10 km of their current location.

## Features Implemented

### 1. **Nearby Toggle Switch**
- Located below the search bar on the patient dashboard
- Clean blue-themed UI with clear labeling
- Description: "Find clinics within 5-10 km of your location"

### 2. **Location Detection**
- Uses the existing `useGeolocation` hook for accurate location detection
- Requests user's location permission when toggle is enabled
- Multiple attempt strategy with 1000m minimum accuracy threshold

### 3. **Nearby Clinics Fetching**
- Leverages the existing `useNearbyClinics` hook
- Fetches clinics within 10 km radius using the `/api/clinics/nearby` endpoint
- Automatically refetches when location changes significantly (>100m)

### 4. **Real-time Status Feedback**
The UI provides clear status messages for different states:
- **Requesting**: Yellow badge - "Getting your location..."
- **Granted**: Green badge - "Location detected • Found X clinics within 10 km"
- **Denied**: Red badge - "Location access denied..."
- **Error**: Red badge with error message
- **Loading**: Blue badge - "Searching for nearby clinics..."

### 5. **Distance Display**
- Each clinic card shows a green badge with distance (e.g., "2.5 km away")
- Positioned in the top-right corner of clinic cards
- Distance calculated by the backend using Haversine formula

### 6. **Smart State Management**
- Search remains enabled when nearby mode is active (combined filtering)
- Does NOT clear search term when enabling nearby filter
- Only fetches all clinics when nearby mode is disabled (query optimization)
- Prevents infinite loops with location tracking

### 7. **Combined Search + Nearby Filtering** ⭐ NEW
- Users can search while nearby mode is active
- Search filters nearby clinics by:
  - Clinic name
  - City/Address
  - **Doctor names** in those clinics
  - **Medical specialties** (e.g., "ENT", "Cardiology")
- Real-time filtering as user types
- Status message updates to show filtered count
- Example: Type "ENT" with nearby enabled → Shows only clinics within 10km that have ENT doctors

### 8. **Error Handling**
- Graceful error messages for location permission issues
- "Try Again" button for location retrieval failures
- Empty state message when no clinics found nearby
- Suggestion to disable filter to see all clinics

## User Flow

### Basic Flow
1. User navigates to patient dashboard
2. User enables "Show Nearby Clinics Only" toggle
3. Browser requests location permission
4. User grants location access
5. System fetches user's coordinates
6. Backend returns clinics within 10 km sorted by distance
7. Clinics display with distance badges
8. User can disable toggle to return to normal view

### Advanced Flow (Search + Nearby)
1. User enables "Show Nearby Clinics Only" toggle
2. Location is detected (clinics within 10km shown)
3. User types "ENT" in search box
4. System:
   - Fetches doctors for each nearby clinic
   - Filters clinics that have ENT specialists
   - Shows only matching clinics with distance badges
5. Status updates to: "Found 3 clinics within 10 km matching 'ENT'"
6. User can clear search to see all nearby clinics again

## Technical Details

### State Management
```typescript
const [nearbyEnabled, setNearbyEnabled] = useState(false);
const [lastFetchedLocation, setLastFetchedLocation] = useState<{lat: number, lng: number} | null>(null);
```

### Location Hook Integration
```typescript
const {
  status: locationStatus,
  coordinates,
  requestLocation,
  error: locationError
} = useGeolocation({ 
  autoRequest: false,
  minAccuracy: 1000,
  maxAttempts: 2
});
```

### Nearby Clinics Hook Integration
```typescript
const {
  clinics: nearbyClinics,
  loading: nearbyLoading,
  error: nearbyError,
  fetchClinics,
  count: nearbyCount
} = useNearbyClinics({ 
  radius: 10 // 10km radius
});
```

### Nearby Doctors Fetching (for search)
```typescript
const { data: nearbyDoctorsData = [] } = useQuery({
  queryKey: ["nearby-doctors", nearbyClinics.map(c => c.id).join(',')],
  queryFn: async () => {
    // Fetch doctors for all nearby clinics
    const promises = nearbyClinics.map(async (clinic) => {
      const response = await fetch(`/api/clinics/${clinic.id}/doctors`);
      const doctors = await response.json();
      return { clinicId: clinic.id, doctors };
    });
    return Promise.all(promises);
  },
  enabled: nearbyEnabled && nearbyClinics.length > 0,
});
```

### Filtered Nearby Clinics (with search)
```typescript
const filteredNearbyClinics = React.useMemo(() => {
  if (!nearbyEnabled || !searchTerm.trim()) {
    return nearbyClinics;
  }

  const searchLower = searchTerm.toLowerCase();
  
  return nearbyClinics.filter((clinic) => {
    // Search by clinic name, city, address
    if (clinic.name.toLowerCase().includes(searchLower)) return true;
    if (clinic.city.toLowerCase().includes(searchLower)) return true;
    if (clinic.address.toLowerCase().includes(searchLower)) return true;
    
    // Search by doctors and specialties
    const clinicDoctors = nearbyDoctorsData.find(d => d.clinicId === clinic.id);
    if (clinicDoctors?.doctors) {
      return clinicDoctors.doctors.some((doctor: any) => 
        doctor.name?.toLowerCase().includes(searchLower) ||
        doctor.specialty?.toLowerCase().includes(searchLower)
      );
    }
    return false;
  });
}, [nearbyClinics, searchTerm, nearbyEnabled, nearbyDoctorsData]);
```

### Query Optimization
- Default clinics query only runs when `nearbyEnabled` is false
- Nearby doctors query only runs when nearby mode is active and clinics exist
- Batched doctor queries for all nearby clinics
- Efficient filtering using React.useMemo

## Backend Compatibility

This feature uses the existing backend endpoint:
```
GET /api/clinics/nearby?lat={latitude}&lng={longitude}&radius={radius}
```

Response format:
```json
{
  "success": true,
  "count": 5,
  "location": {
    "latitude": 13.0827,
    "longitude": 80.2707,
    "radius": 10
  },
  "clinics": [
    {
      "id": 1,
      "name": "City Medical Center",
      "address": "123 Main Street",
      "city": "Chennai",
      "latitude": 13.0850,
      "longitude": 80.2750,
      "distance": 2.3,
      ...
    }
  ]
}
```

## UI Components Used

- `Switch` - Toggle component from Radix UI
- `Label` - Label component for accessibility
- `Badge` - Distance and status indicators
- `Navigation` icon - Location icon
- `Loader2` icon - Loading spinner
- `MapPin` icon - Location-related indicators

## Files Modified

1. `client/src/pages/patient-dashboard.tsx`
   - Added nearby toggle UI
   - Integrated geolocation and nearby clinics hooks
   - Added state management for nearby mode
   - Implemented conditional rendering for nearby clinics
   - Added distance badges to clinic cards

## Testing Checklist

### Basic Nearby Functionality
- [ ] Toggle enables/disables correctly
- [ ] Location permission prompt appears
- [ ] Clinics within 10km are displayed
- [ ] Distance badges show correct values
- [ ] Toggle disabling returns to normal view
- [ ] Error messages display appropriately
- [ ] Loading states work correctly
- [ ] Empty state shows when no clinics nearby
- [ ] "Try Again" button works for location errors

### Search + Nearby Combined
- [ ] Search box remains enabled when nearby is active
- [ ] Typing in search filters nearby clinics
- [ ] Searching by clinic name works
- [ ] Searching by city works
- [ ] Searching by doctor name works (e.g., "Dr. Smith")
- [ ] Searching by specialty works (e.g., "ENT", "Cardiology")
- [ ] Search placeholder changes when nearby is active
- [ ] Filtered count updates in status message
- [ ] Clearing search shows all nearby clinics again
- [ ] Empty state shows correct message when no matches found

## Future Enhancements

1. **Adjustable Radius**: Add a slider to let users choose radius (5km, 10km, 20km)
2. **Sort Options**: Sort by distance, rating, or availability
3. **Map View**: Show nearby clinics on an interactive map
4. **Save Location**: Remember user's location for future visits
5. **Offline Support**: Cache nearby clinics for offline access
6. **Real-time Updates**: Update clinic list as user moves
7. **Advanced Filters**: Add checkboxes for insurance, facilities, languages
8. **Doctor Availability**: Show only clinics with available appointments
9. **Specialty Icons**: Visual indicators for specialties available
10. **Voice Search**: Enable voice input for search queries

## Accessibility

- Toggle has proper `id` and `htmlFor` attributes
- Clear labels and descriptions
- Keyboard navigable
- Screen reader friendly status messages
- Color-blind friendly status indicators (icons + text)
