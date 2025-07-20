import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Database types
export interface ParkingEntry {
  id: number
  plate_number: string
  entry_time: string
  exit_time: string | null
  payment: number | null
  is_overnight?: boolean
  created_at?: string
  updated_at?: string
}

// Check if Supabase is configured
const isSupabaseConfigured = supabaseUrl && supabaseAnonKey

// Create Supabase client if configured
export const supabase = isSupabaseConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

// Create parkingService based on configuration
export const parkingService = isSupabaseConfigured ? {
  // Supabase implementation
  async getAllEntries(): Promise<ParkingEntry[]> {
    if (!supabase) throw new Error('Supabase not configured')
    
    const { data, error } = await supabase
      .from('parking_entries')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Error fetching parking entries:', error)
      throw error
    }
    
    return data || []
  },

  async createEntry(entry: Omit<ParkingEntry, 'id' | 'created_at' | 'updated_at'>): Promise<ParkingEntry> {
    if (!supabase) throw new Error('Supabase not configured')
    
    console.log('Supabase: Attempting to create entry:', entry)
    
    const { data, error } = await supabase
      .from('parking_entries')
      .insert([entry])
      .select()
      .single()
    
    if (error) {
      console.error('Supabase: Error creating parking entry:', error)
      throw error
    }
    
    console.log('Supabase: Entry created successfully:', data)
    return data
  },

  async updateEntry(id: number, updates: Partial<ParkingEntry>): Promise<ParkingEntry> {
    if (!supabase) throw new Error('Supabase not configured')
    
    const { data, error } = await supabase
      .from('parking_entries')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) {
      console.error('Error updating parking entry:', error)
      throw error
    }
    
    return data
  },

  async deleteEntry(id: number): Promise<void> {
    if (!supabase) throw new Error('Supabase not configured')
    
    const { error } = await supabase
      .from('parking_entries')
      .delete()
      .eq('id', id)
    
    if (error) {
      console.error('Error deleting parking entry:', error)
      throw error
    }
  },

  async deleteEntriesByPlate(plateNumber: string): Promise<void> {
    if (!supabase) throw new Error('Supabase not configured')
    
    const { error } = await supabase
      .from('parking_entries')
      .delete()
      .eq('plate_number', plateNumber)
    
    if (error) {
      console.error('Error deleting entries by plate:', error)
      throw error
    }
  }
} : {
  // localStorage fallback implementation
  async getAllEntries(): Promise<ParkingEntry[]> {
    console.warn('Using localStorage fallback - Supabase not configured')
    const entries = JSON.parse(localStorage.getItem("parkingEntries") || "[]")
    return entries.map((entry: any) => ({
      id: entry.id,
      plate_number: entry.plateNumber,
      entry_time: entry.entryTime,
      exit_time: entry.exitTime,
      payment: entry.payment,
      is_overnight: entry.isOvernight || false,
      created_at: entry.entryTime,
      updated_at: entry.exitTime || entry.entryTime
    }))
  },

  async createEntry(entry: Omit<ParkingEntry, 'id' | 'created_at' | 'updated_at'>): Promise<ParkingEntry> {
    console.warn('Using localStorage fallback - Supabase not configured')
    console.log('localStorage: Creating entry:', entry)
    
    const entries = JSON.parse(localStorage.getItem("parkingEntries") || "[]")
    const newEntry = {
      id: Date.now(),
      plateNumber: entry.plate_number,
      entryTime: entry.entry_time,
      exitTime: entry.exit_time,
      payment: entry.payment,
      isOvernight: entry.is_overnight
    }
    entries.push(newEntry)
    localStorage.setItem("parkingEntries", JSON.stringify(entries))
    
    const result = {
      id: newEntry.id,
      plate_number: newEntry.plateNumber,
      entry_time: newEntry.entryTime,
      exit_time: newEntry.exitTime,
      payment: newEntry.payment,
      is_overnight: newEntry.isOvernight,
      created_at: newEntry.entryTime,
      updated_at: newEntry.entryTime
    }
    
    console.log('localStorage: Entry created successfully:', result)
    return result
  },

  async updateEntry(id: number, updates: Partial<ParkingEntry>): Promise<ParkingEntry> {
    console.warn('Using localStorage fallback - Supabase not configured')
    const entries = JSON.parse(localStorage.getItem("parkingEntries") || "[]")
    const updatedEntries = entries.map((entry: any) => 
      entry.id === id 
        ? { 
            ...entry, 
            exitTime: updates.exit_time || entry.exitTime,
            payment: updates.payment !== undefined ? updates.payment : entry.payment,
            isOvernight: updates.is_overnight !== undefined ? updates.is_overnight : entry.isOvernight
          }
        : entry
    )
    localStorage.setItem("parkingEntries", JSON.stringify(updatedEntries))
    const updatedEntry = updatedEntries.find((entry: any) => entry.id === id)
    return {
      id: updatedEntry.id,
      plate_number: updatedEntry.plateNumber,
      entry_time: updatedEntry.entryTime,
      exit_time: updatedEntry.exitTime,
      payment: updatedEntry.payment,
      is_overnight: updatedEntry.isOvernight,
      created_at: updatedEntry.entryTime,
      updated_at: updatedEntry.exitTime || updatedEntry.entryTime
    }
  },

  async deleteEntry(id: number): Promise<void> {
    console.warn('Using localStorage fallback - Supabase not configured')
    const entries = JSON.parse(localStorage.getItem("parkingEntries") || "[]")
    const filteredEntries = entries.filter((entry: any) => entry.id !== id)
    localStorage.setItem("parkingEntries", JSON.stringify(filteredEntries))
  },

  async deleteEntriesByPlate(plateNumber: string): Promise<void> {
    console.warn('Using localStorage fallback - Supabase not configured')
    const entries = JSON.parse(localStorage.getItem("parkingEntries") || "[]")
    const filteredEntries = entries.filter((entry: any) => entry.plateNumber !== plateNumber)
    localStorage.setItem("parkingEntries", JSON.stringify(filteredEntries))
  }
} 