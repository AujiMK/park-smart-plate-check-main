# Migration Setup Guide

## Step 4: Test the Migration

### 1. Set Up Environment Variables

Create a `.env` file in your project root with your Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

**To get these values:**
1. Go to your Supabase Dashboard
2. Click on your project
3. Go to Settings → API
4. Copy the "Project URL" and "anon public" key

### 2. Create the Database Table

Run the SQL query from `create_parking_entries_table.sql` in your Supabase SQL Editor:

1. Go to Supabase Dashboard → SQL Editor
2. Copy and paste the entire SQL script
3. Click "Run" to create the table

### 3. Test the Migration

**Action Required:** Simply refresh your application!

The migration will happen automatically when you:

1. **Open your app** at `http://localhost:8081/`
2. **Navigate to the Staff Interface**
3. **Check the browser console** (F12 → Console tab)

### 4. What You'll See

**In the Browser Console:**
```
Starting migration from localStorage to Supabase...
Found X entries in localStorage
Migrated entry for ABC123
Migrated entry for XYZ789
Migration completed successfully!
```

**In the UI:**
- A toast notification: "Data Migration - Successfully migrated data from localStorage to Supabase"
- All your existing parking entries will now be loaded from Supabase

### 5. Verify the Migration

**Check Supabase Dashboard:**
1. Go to Table Editor
2. Click on `parking_entries` table
3. You should see all your localStorage data there

**Test New Entries:**
1. Try adding a new vehicle entry
2. It should be saved to Supabase (not localStorage)
3. Check the Supabase table to confirm

### 6. Troubleshooting

**If migration fails:**
- Check your environment variables are correct
- Ensure the database table was created successfully
- Check browser console for error messages

**If no migration happens:**
- Check if you have data in localStorage
- Verify the migration status in browser console

### 7. Optional: Clear localStorage

After successful migration, you can optionally clear localStorage:
1. Open browser console
2. Run: `localStorage.removeItem("parkingEntries")`
3. Refresh the page

The app will now work entirely with Supabase! 🎉 