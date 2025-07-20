import { parkingService, ParkingEntry } from './supabase'

// Migration function to copy localStorage data to Supabase
export const migrateLocalStorageToSupabase = async () => {
  try {
    console.log('Starting migration from localStorage to Supabase...')
    
    // Get current localStorage data
    const localStorageEntries = JSON.parse(localStorage.getItem("parkingEntries") || "[]")
    console.log(`Found ${localStorageEntries.length} entries in localStorage`)
    
    if (localStorageEntries.length === 0) {
      console.log('No entries to migrate')
      return
    }
    
    // Transform localStorage data to match Supabase schema
    const transformedEntries = localStorageEntries.map((entry: any) => ({
      plate_number: entry.plateNumber,
      entry_time: entry.entryTime,
      exit_time: entry.exitTime,
      payment: entry.payment,
      is_overnight: entry.isOvernight || false
    }))
    
    // Insert all entries into Supabase
    for (const entry of transformedEntries) {
      await parkingService.createEntry(entry)
      console.log(`Migrated entry for ${entry.plate_number}`)
    }
    
    console.log('Migration completed successfully!')
    
    // Optionally, you can clear localStorage after successful migration
    // localStorage.removeItem("parkingEntries")
    
  } catch (error) {
    console.error('Migration failed:', error)
    throw error
  }
}

// Function to check if migration is needed
export const checkMigrationStatus = async () => {
  try {
    const supabaseEntries = await parkingService.getAllEntries()
    const localStorageEntries = JSON.parse(localStorage.getItem("parkingEntries") || "[]")
    
    console.log(`Supabase entries: ${supabaseEntries.length}`)
    console.log(`localStorage entries: ${localStorageEntries.length}`)
    
    return {
      supabaseCount: supabaseEntries.length,
      localStorageCount: localStorageEntries.length,
      needsMigration: supabaseEntries.length === 0 && localStorageEntries.length > 0
    }
  } catch (error) {
    console.error('Error checking migration status:', error)
    return {
      supabaseCount: 0,
      localStorageCount: 0,
      needsMigration: false,
      error: error
    }
  }
} 