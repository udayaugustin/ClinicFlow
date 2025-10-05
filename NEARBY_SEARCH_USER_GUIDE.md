# Nearby Search Feature - User Guide

## What is the Nearby Search Feature?

The Nearby Search feature helps you find healthcare clinics, doctors, and specialists within 5-10 km of your current location. You can also search for specific doctors or specialties while staying within your preferred radius.

---

## How to Use

### Step 1: Enable Nearby Mode

1. On the "Find Healthcare Near You" page, look for the blue toggle box that says **"Show Nearby Clinics Only"**
2. Click or tap the toggle switch to turn it ON (it will turn blue)
3. Your browser will ask for location permission
4. Click **"Allow"** to share your location

### Step 2: View Nearby Clinics

Once your location is detected:
- You'll see a **green success message** showing how many clinics were found within 10 km
- Each clinic card will display a **green distance badge** (e.g., "1.5 km away")
- Clinics are automatically sorted by distance (closest first)

### Step 3: Search Within Nearby Clinics (NEW! ⭐)

While nearby mode is active, you can now search to filter results:

#### Search by Specialty
**Example:** Type `ENT` in the search box
- System will show only nearby clinics that have ENT specialists
- Distance badges remain visible
- Status updates to: _"Found 3 clinics within 10 km matching 'ENT'"_

#### Search by Doctor Name
**Example:** Type `Dr. Smith`
- Shows clinics where Dr. Smith practices (within 10 km)

#### Search by Clinic Name
**Example:** Type `Metro Hospital`
- Shows only Metro Hospital if it's within 10 km

#### Search by Location
**Example:** Type `Chennai` or `Anna Nagar`
- Shows nearby clinics in that area

---

## Real-World Examples

### Example 1: Finding an ENT Doctor Nearby
```
1. Enable "Show Nearby Clinics Only" toggle
2. Browser detects your location
3. Status: "Found 12 clinics within 10 km"
4. Type "ENT" in search box
5. Results filter to show: "Found 3 clinics within 10 km matching 'ENT'"
6. All shown clinics have ENT doctors AND are within 10 km
```

### Example 2: Finding a Cardiologist
```
1. Toggle ON "Show Nearby Clinics Only"
2. Type "Cardiology" or "Cardiologist"
3. See only nearby clinics with cardiology specialists
4. Each card shows distance (e.g., "2.3 km away")
```

### Example 3: Finding a Specific Hospital
```
1. Toggle ON "Show Nearby Clinics Only"
2. Type "Apollo Hospital"
3. If Apollo Hospital is within 10 km, it will appear
4. If not, you'll see: "No clinics found matching 'Apollo Hospital' within 10 km"
```

---

## Understanding Status Messages

### 🟡 Yellow - Getting Location
```
⏳ Getting your location...
```
- Browser is requesting your GPS coordinates
- Usually takes 2-5 seconds

### 🟢 Green - Location Detected
```
✅ Location detected • Found 5 clinics within 10 km  [±212m accuracy]
```
- Your location was successfully detected
- Number shows how many clinics are nearby
- Accuracy badge shows GPS precision

### 🟢 Green - With Search Filter
```
✅ Location detected • Found 3 clinics within 10 km matching "ENT"
```
- Shows filtered results based on your search
- Clinics match BOTH location AND search criteria

### 🔴 Red - Location Denied
```
❌ Location access denied. Please enable location permissions to use this feature.
```
- You denied location permission
- Click "Try Again" and allow permission

### 🔴 Red - No Results
```
🏥 No clinics found matching "ENT" within 10 km of your location.
```
- Your search had no matches nearby
- Try: Different search term or disable nearby filter

---

## Tips & Tricks

### ✅ Best Practices

1. **Use Specific Terms**
   - ✅ "ENT", "Cardiology", "Orthopedic"
   - ❌ "good doctor", "best clinic"

2. **Try Partial Names**
   - ✅ "Apollo" (finds Apollo Hospital)
   - ✅ "City Med" (finds City Medical Center)

3. **Common Specialties to Search**
   - ENT (Ear, Nose, Throat)
   - Cardiology (Heart)
   - Dermatology (Skin)
   - Orthopedic (Bones & Joints)
   - Pediatrics (Children)
   - Gynecology (Women's Health)

4. **Clear Search to See All**
   - Delete your search text to see all nearby clinics again

### 🚫 Common Issues & Solutions

#### Issue: "Location access denied"
**Solution:** 
1. Click the location icon in your browser's address bar
2. Change permission to "Always allow"
3. Refresh the page
4. Try again

#### Issue: "No clinics found nearby"
**Solution:**
- You might be in a rural area with fewer clinics
- Try disabling the nearby filter to see all clinics
- Or increase your search radius (future feature)

#### Issue: Search not working
**Solution:**
- Make sure nearby mode is enabled (toggle ON)
- Wait for location to be detected (green status)
- Then type your search term

#### Issue: Distance seems wrong
**Solution:**
- Check the accuracy badge (e.g., ±212m)
- Higher accuracy = more reliable distance
- GPS works best outdoors

---

## Privacy & Permissions

### What Location Data is Used?
- Your GPS coordinates (latitude & longitude only)
- Accuracy level (in meters)
- **NO personal information is stored**

### When is Location Requested?
- Only when you toggle ON "Show Nearby Clinics Only"
- Not automatically on page load
- You control when to share location

### Can I Disable Location?
- Yes! Simply toggle OFF "Show Nearby Clinics Only"
- Your location data is immediately discarded
- You'll return to seeing all clinics

---

## Keyboard Shortcuts

- **Tab** - Navigate between toggle and search box
- **Space** - Toggle nearby mode ON/OFF (when focused)
- **Escape** - Clear search (when search box is focused)
- **Enter** - No action needed (search is real-time)

---

## Mobile vs Desktop

### Mobile (Phone/Tablet)
- Location detection may be more accurate (built-in GPS)
- Search works the same way
- Cards stack in single column for better viewing
- Swipe up/down to scroll results

### Desktop (Laptop/Computer)
- Location uses WiFi positioning (less accurate)
- Accuracy typically ±100-500 meters
- Cards display in grid (2-4 columns)
- Mouse wheel to scroll results

---

## FAQs

### Q: Does nearby mode work without internet?
**A:** No, you need internet to:
- Detect your location
- Fetch nearby clinics
- Load doctor information

### Q: Can I change the radius from 10 km?
**A:** Not yet, but this is planned for a future update!

### Q: Does it show doctors' availability?
**A:** The search shows which clinics have specific specialists. Click "View Doctors" on any clinic card to see schedules and availability.

### Q: Can I search for multiple specialties?
**A:** Currently, you can search for one specialty at a time. Try searching for each separately.

### Q: Will my location be saved?
**A:** Location is cached temporarily for performance but is not permanently stored. It's cleared when you close the browser.

### Q: What if I'm traveling?
**A:** Perfect! The nearby feature works anywhere. Just enable it in your new location to find clinics nearby.

---

## Need Help?

If you encounter any issues:
1. Try refreshing the page
2. Clear your browser cache
3. Check that location services are enabled in your device settings
4. Contact support with details about the issue

---

## Coming Soon! 🚀

Features in development:
- 📏 Adjustable radius (5km, 10km, 20km options)
- 🗺️ Interactive map view
- 💾 Save favorite clinics
- 🔔 Notifications for nearby appointments
- 🎤 Voice search support
