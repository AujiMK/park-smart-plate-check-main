# Supabase Verification Guide

## Step 1: Check Environment Variables

1. **Open your `.env` file** in your project root
2. **Verify it contains:**
   ```env
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
   ```

## Step 2: Check Browser Console

1. **Open your app** at `http://localhost:8081/`
2. **Open browser console** (F12 → Console tab)
3. **Look for these messages:**

   **If Supabase is working:**
   ```
   Supabase entries: X
   localStorage entries: Y
   ```

   **If using fallback:**
   ```
   Using localStorage fallback - Supabase not configured
   ```

## Step 3: Test New Entry Creation

1. **Go to Staff Interface**
2. **Add a new vehicle entry** (e.g., "TEST123")
3. **Check browser console** for:
   ```
   Using localStorage fallback - Supabase not configured
   ```
   OR
   ```
   Error creating parking entry: [error details]
   ```

## Step 4: Check Supabase Dashboard

1. **Go to your Supabase Dashboard**
2. **Navigate to Table Editor**
3. **Click on `parking_entries` table**
4. **Look for your new entry**

## Step 5: Manual Database Check

**In Supabase SQL Editor, run:**
```sql
SELECT * FROM parking_entries ORDER BY created_at DESC LIMIT 10;
```

## Troubleshooting

### If you see "localStorage fallback" messages:
- Your environment variables are not set correctly
- Check your `.env` file exists and has correct values

### If you see Supabase errors:
- Check your API key is correct
- Verify the table exists in your database
- Check RLS (Row Level Security) settings

### If no data appears in Supabase:
- Check browser console for error messages
- Verify your Supabase project URL and API key
- Ensure the `parking_entries` table was created successfully 