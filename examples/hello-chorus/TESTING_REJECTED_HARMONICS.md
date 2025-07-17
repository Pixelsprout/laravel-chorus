# Testing Rejected Harmonics

## Overview
The rejected harmonics feature is now fully implemented. Here's how to test it:

## What's Implemented

### 1. **Server-Side**
- ✅ Added `rejected` and `rejected_reason` columns to harmonics table
- ✅ Updated Harmonic model with helper methods for creating rejected harmonics
- ✅ Updated API route to create rejected harmonics on validation failures

### 2. **Client-Side**
- ✅ Updated TypeScript types to include rejected fields
- ✅ Enhanced ChorusCore to handle rejected harmonics
- ✅ Created RejectedHarmonicsContext for state management
- ✅ Integrated with React provider and dashboard

### 3. **UI Components**
- ✅ Toast notifications in top-right corner
- ✅ Failed operations section in dashboard
- ✅ Test button to simulate rejections

## How to Test

### 1. **Start the Application**
```bash
cd examples/hello-chorus
php artisan serve
npm run dev
```

### 2. **Navigate to Dashboard**
- Go to `/dashboard` in your browser
- Make sure you're logged in

### 3. **Test Rejected Harmonics**

#### **Method 1: Use Test Button**
1. Click the "Test Rejection" button in the message form
2. This sends invalid data (empty message, invalid platform ID)
3. Watch for:
   - Toast notification in top-right corner
   - "Failed Operations" section appears in dashboard
   - Console logs showing the rejected harmonic

#### **Method 2: Manual Invalid Input**
1. Try to submit a message with:
   - Empty message body
   - Invalid platform selection
2. The server will reject it and send a rejected harmonic

### 4. **Expected Behavior**

#### **Toast Notifications**
- Appear in top-right corner
- Yellow background for validation errors
- Red background for permission/other errors
- Auto-dismiss after 8 seconds
- Manual dismiss with × button

#### **Dashboard Section**
- "Failed Operations" section appears when there are rejections
- Shows detailed information about each failure
- Expandable details showing original data
- "Clear All" button to dismiss all notifications

#### **Console Logs**
```
Received rejected harmonic: {id: "...", rejected: true, rejected_reason: "Validation failed: ..."}
AppSidebarLayoutContent - notifications count: 1
DashboardContent - rejectedNotifications count: 1
```

## Troubleshooting

### **If you see "useRejectedHarmonics must be used within a RejectedHarmonicsProvider"**
- This error should be fixed with the latest changes
- The context now provides default values instead of throwing
- Check console for warning message

### **If rejected harmonics aren't appearing**
1. Check browser console for errors
2. Verify the server is creating rejected harmonics:
   ```sql
   SELECT * FROM harmonics WHERE rejected = 1;
   ```
3. Check that Laravel Reverb is running and connected
4. Verify the user is authenticated

### **If notifications don't auto-dismiss**
- Check browser console for JavaScript errors
- The timeout is set to 8 seconds

## Code Locations

### **Server-Side**
- `packages/chorus/src/Models/Harmonic.php` - Model with helper methods
- `examples/hello-chorus/routes/api.php` - API route with rejection logic
- `examples/hello-chorus/database/migrations/*_add_rejected_columns_to_harmonics_table.php` - Database migration

### **Client-Side**
- `packages/chorus-js/src/core/types.ts` - TypeScript types
- `packages/chorus-js/src/core/chorus.ts` - Core rejection handling
- `packages/chorus-js/src/react/providers/ChorusProvider.tsx` - React provider
- `examples/hello-chorus/resources/js/contexts/RejectedHarmonicsContext.tsx` - Context for state management
- `examples/hello-chorus/resources/js/layouts/app/app-sidebar-layout.tsx` - Layout with notifications
- `examples/hello-chorus/resources/js/pages/dashboard.tsx` - Dashboard integration

## Next Steps

1. **Test the feature** using the methods above
2. **Customize the UI** to match your design system
3. **Add more rejection types** (rate limiting, business rules, etc.)
4. **Implement retry mechanisms** for failed operations
5. **Add persistence** for rejected operations across page reloads