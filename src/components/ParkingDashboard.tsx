import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Car, Clock, DollarSign, LogOut, Users, Search, Calendar, AlertTriangle, TrendingUp, TrendingDown, BarChart3, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { parkingService, ParkingEntry as SupabaseParkingEntry } from "@/lib/supabase";
import { migrateLocalStorageToSupabase, checkMigrationStatus } from "@/lib/migrateToSupabase";

interface ParkingEntry {
  id: number;
  plateNumber: string;
  entryTime: string;
  exitTime: string | null;
  payment: number | null;
  isOvernight?: boolean;
}

interface ParkingDashboardProps {
  refreshTrigger: number;
}

type RevenuePeriod = 'today' | 'month';

export const ParkingDashboard = ({ refreshTrigger }: ParkingDashboardProps) => {
  const [entries, setEntries] = useState<ParkingEntry[]>([]);
  const [revenuePeriod, setRevenuePeriod] = useState<RevenuePeriod>('today');
  const [searchPlate, setSearchPlate] = useState("");
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [monthlyStats, setMonthlyStats] = useState<any>(null);
  const [overnightSearch, setOvernightSearch] = useState("");
  const { toast } = useToast();

  const ratePerHalfHour = 0.50; // $0.50 per 30 minutes
  const BUSINESS_END_HOUR = 17;
  const BUSINESS_END_MINUTE = 30;

  useEffect(() => {
    loadEntries();
  }, [refreshTrigger]);

  const loadEntries = async () => {
    try {
      // Check if we need to migrate from localStorage
      const migrationStatus = await checkMigrationStatus();
      
      if (migrationStatus.needsMigration) {
        console.log('Migrating data from localStorage to Supabase...');
        await migrateLocalStorageToSupabase();
        toast({
          title: "Data Migration",
          description: "Successfully migrated data from localStorage to Supabase",
        });
      }
      
      // Load entries from Supabase
      const supabaseEntries = await parkingService.getAllEntries();
      
      // Transform Supabase entries to match our local interface
      const transformedEntries = supabaseEntries.map(entry => ({
        id: entry.id,
        plateNumber: entry.plate_number,
        entryTime: entry.entry_time,
        exitTime: entry.exit_time,
        payment: entry.payment,
        isOvernight: entry.is_overnight
      }));
      
      setEntries(transformedEntries);
    } catch (error) {
      console.error('Error loading entries:', error);
      toast({
        title: "Error",
        description: "Failed to load parking entries",
        variant: "destructive",
      });
    }
  };

  // Check if vehicle has outstanding overnight parking (entered before 5:30 PM and still parked after 5:30 PM)
  const hasOutstandingOvernightParking = (entry: ParkingEntry) => {
    if (entry.exitTime) {
      console.log(`Vehicle ${entry.plateNumber} (ID: ${entry.id}) has exitTime: ${entry.exitTime}, skipping overnight check`);
      return false; // Already exited
    }
    
    const entryDate = new Date(entry.entryTime);
    const now = new Date();
    
    // Check if it's currently after 5:30 PM
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = currentHour * 60 + currentMinute;
    const endTime = BUSINESS_END_HOUR * 60 + BUSINESS_END_MINUTE; // 5:30 PM
    
    // Check if it's from previous day (simpler date comparison)
    const entryDateOnly = new Date(entryDate.getFullYear(), entryDate.getMonth(), entryDate.getDate());
    const currentDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const isPreviousDay = entryDateOnly < currentDateOnly;
    
    // Check if vehicle entered before 5:30 PM on same day
    const entryHour = entryDate.getHours();
    const entryMinute = entryDate.getMinutes();
    const entryTimeMinutes = entryHour * 60 + entryMinute;
    const enteredBeforeBusinessEnd = entryTimeMinutes < endTime;
    
    // Consider overnight if:
    // 1. Previous day: any vehicle from previous day still parked AND entered before 5:30 PM
    // 2. Same day: entered before 5:30 PM and currently after 5:30 PM
    const isOvernight = (isPreviousDay && enteredBeforeBusinessEnd) || (enteredBeforeBusinessEnd && currentTime >= endTime);
    
    console.log(`Vehicle ${entry.plateNumber} (ID: ${entry.id}) - isPreviousDay: ${isPreviousDay}, enteredBeforeBusinessEnd: ${enteredBeforeBusinessEnd}, currentTime >= endTime: ${currentTime >= endTime}, isOvernight: ${isOvernight}`);
    
    return isOvernight;
  };

  // Calculate payment including overnight charges
  const calculatePayment = (entryTime: string, exitTime: string) => {
    const entry = new Date(entryTime);
    const exit = new Date(exitTime);
    
    // Check if this is overnight parking
    const entryHour = entry.getHours();
    const entryMinute = entry.getMinutes();
    const entryTimeMinutes = entryHour * 60 + entryMinute;
    const endTime = BUSINESS_END_HOUR * 60 + BUSINESS_END_MINUTE; // 5:30 PM
    const isOvernight = entryTimeMinutes < endTime;
    
    if (isOvernight) {
      // For overnight parking, calculate from entry time to 5:30 PM
      const endOfDay = new Date(entry);
      endOfDay.setHours(BUSINESS_END_HOUR, BUSINESS_END_MINUTE, 0, 0);
      
      const minutes = Math.ceil((endOfDay.getTime() - entry.getTime()) / (1000 * 60));
      const halfHourBlocks = Math.ceil(minutes / 30);
      return Math.max(halfHourBlocks * ratePerHalfHour, ratePerHalfHour);
    } else {
      // Regular parking calculation
      const minutes = Math.ceil((exit.getTime() - entry.getTime()) / (1000 * 60));
      const halfHourBlocks = Math.ceil(minutes / 30);
      return Math.max(halfHourBlocks * ratePerHalfHour, ratePerHalfHour);
    }
  };

  // Check if vehicle has outstanding overnight parking from previous entries
  const checkForOutstandingOvernight = (plateNumber: string, currentEntryId: number) => {
    const vehicleEntries = entries.filter(
      entry => entry.plateNumber.toLowerCase() === plateNumber.toLowerCase() && entry.id !== currentEntryId
    );
    
    if (vehicleEntries.length === 0) return false;
    
    // Check if there's a previous entry that's still parked and is overnight
    const previousOvernightEntry = vehicleEntries.find(entry => {
      if (entry.exitTime) return false; // Already exited
      
      const entryDate = new Date(entry.entryTime);
      const now = new Date();
      
      // Check if it's from previous day
      const entryDateOnly = new Date(entryDate.getFullYear(), entryDate.getMonth(), entryDate.getDate());
      const currentDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const isPreviousDay = entryDateOnly < currentDateOnly;
      
      // Check if vehicle entered before 5:30 PM on same day
      const entryHour = entryDate.getHours();
      const entryMinute = entryDate.getMinutes();
      const entryTimeMinutes = entryHour * 60 + entryMinute;
      const endTime = BUSINESS_END_HOUR * 60 + BUSINESS_END_MINUTE; // 5:30 PM
      const enteredBeforeBusinessEnd = entryTimeMinutes < endTime;
      
      return (isPreviousDay && enteredBeforeBusinessEnd) || (enteredBeforeBusinessEnd && now.getHours() >= BUSINESS_END_HOUR && now.getMinutes() >= BUSINESS_END_MINUTE);
    });
    
    return !!previousOvernightEntry;
  };

  // Calculate outstanding overnight fee for a specific vehicle
  const calculateOutstandingOvernightFee = (plateNumber: string, currentEntryId: number) => {
    const vehicleEntries = entries.filter(
      entry => entry.plateNumber.toLowerCase() === plateNumber.toLowerCase() && entry.id !== currentEntryId
    );
    
    if (vehicleEntries.length === 0) return 0;
    
    // Find the previous overnight entry
    const previousOvernightEntry = vehicleEntries.find(entry => {
      if (entry.exitTime) return false;
      
      const entryDate = new Date(entry.entryTime);
      const now = new Date();
      
      const entryDateOnly = new Date(entryDate.getFullYear(), entryDate.getMonth(), entryDate.getDate());
      const currentDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const isPreviousDay = entryDateOnly < currentDateOnly;
      
      const entryHour = entryDate.getHours();
      const entryMinute = entryDate.getMinutes();
      const entryTimeMinutes = entryHour * 60 + entryMinute;
      const endTime = BUSINESS_END_HOUR * 60 + BUSINESS_END_MINUTE;
      const enteredBeforeBusinessEnd = entryTimeMinutes < endTime;
      
      return (isPreviousDay && enteredBeforeBusinessEnd) || (enteredBeforeBusinessEnd && now.getHours() >= BUSINESS_END_HOUR && now.getMinutes() >= BUSINESS_END_MINUTE);
    });
    
    if (!previousOvernightEntry) return 0;
    
    // Calculate fee from entry time to 5:30 PM of entry day
    const entryDate = new Date(previousOvernightEntry.entryTime);
    const endOfDay = new Date(entryDate);
    endOfDay.setHours(BUSINESS_END_HOUR, BUSINESS_END_MINUTE, 0, 0);
    
    const minutes = Math.ceil((endOfDay.getTime() - entryDate.getTime()) / (1000 * 60));
    const halfHourBlocks = Math.ceil(minutes / 30);
    return Math.max(halfHourBlocks * ratePerHalfHour, ratePerHalfHour);
  };

  // Calculate current outstanding fee for parked vehicles
  const calculateOutstandingFee = (entry: ParkingEntry) => {
    const entryDate = new Date(entry.entryTime);
    const now = new Date();
    
    // Check if it's currently after 5:30 PM
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = currentHour * 60 + currentMinute;
    const endTime = BUSINESS_END_HOUR * 60 + BUSINESS_END_MINUTE; // 5:30 PM
    const isCurrentlyAfterBusinessHours = currentTime >= endTime;
    
    // Check if vehicle entered before 5:30 PM
    const entryHour = entryDate.getHours();
    const entryMinute = entryDate.getMinutes();
    const entryTimeMinutes = entryHour * 60 + entryMinute;
    const enteredBeforeBusinessEnd = entryTimeMinutes < endTime;
    
    // Check if it's from previous day (simpler date comparison)
    const entryDateOnly = new Date(entryDate.getFullYear(), entryDate.getMonth(), entryDate.getDate());
    const currentDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const isPreviousDay = entryDateOnly < currentDateOnly;
    
    if (isPreviousDay) {
      // For vehicles from previous day, calculate from entry time to 5:30 PM of entry day
      const endOfDay = new Date(entryDate);
      endOfDay.setHours(BUSINESS_END_HOUR, BUSINESS_END_MINUTE, 0, 0);
      
      const minutes = Math.ceil((endOfDay.getTime() - entryDate.getTime()) / (1000 * 60));
      const halfHourBlocks = Math.ceil(minutes / 30);
      return Math.max(halfHourBlocks * ratePerHalfHour, ratePerHalfHour);
    } else if (isCurrentlyAfterBusinessHours && enteredBeforeBusinessEnd) {
      // Overnight parking: calculate from entry time to 5:30 PM
      const endOfDay = new Date(entryDate);
      endOfDay.setHours(BUSINESS_END_HOUR, BUSINESS_END_MINUTE, 0, 0);
      
      const minutes = Math.ceil((endOfDay.getTime() - entryDate.getTime()) / (1000 * 60));
      const halfHourBlocks = Math.ceil(minutes / 30);
      return Math.max(halfHourBlocks * ratePerHalfHour, ratePerHalfHour);
    } else {
      // Regular parking calculation: from entry time to current time
      const minutes = Math.ceil((now.getTime() - entryDate.getTime()) / (1000 * 60));
      const halfHourBlocks = Math.ceil(minutes / 30);
      return Math.max(halfHourBlocks * ratePerHalfHour, ratePerHalfHour);
    }
  };

  // Calculate fee breakdown for exited vehicles
  const calculateExitFeeBreakdown = (entry: ParkingEntry) => {
    if (!entry.exitTime) return null;
    
    // Check if this vehicle had outstanding overnight parking
    const entries = JSON.parse(localStorage.getItem("parkingEntries") || "[]");
    const vehicleEntries = entries.filter(
      (e: ParkingEntry) => e.plateNumber.toLowerCase() === entry.plateNumber.toLowerCase() && e.id !== entry.id && !e.exitTime
    );
    
    if (vehicleEntries.length > 0) {
      // Find the previous overnight entry
      const previousOvernightEntry = vehicleEntries.find(e => {
        const eDate = new Date(e.entryTime);
        const exitDate = new Date(entry.exitTime!);
        
        const eDateOnly = new Date(eDate.getFullYear(), eDate.getMonth(), eDate.getDate());
        const exitDateOnly = new Date(exitDate.getFullYear(), exitDate.getMonth(), exitDate.getDate());
        const isPreviousDay = eDateOnly < exitDateOnly;
        
        const entryHour = eDate.getHours();
        const entryMinute = eDate.getMinutes();
        const entryTimeMinutes = entryHour * 60 + entryMinute;
        const endTime = BUSINESS_END_HOUR * 60 + BUSINESS_END_MINUTE;
        const enteredBeforeBusinessEnd = entryTimeMinutes < endTime;
        
        return (isPreviousDay && enteredBeforeBusinessEnd) || (enteredBeforeBusinessEnd && exitDate.getHours() >= BUSINESS_END_HOUR && exitDate.getMinutes() >= BUSINESS_END_MINUTE);
      });
      
      if (previousOvernightEntry) {
        const overnightEntryDate = new Date(previousOvernightEntry.entryTime);
        const endOfDay = new Date(overnightEntryDate);
        endOfDay.setHours(BUSINESS_END_HOUR, BUSINESS_END_MINUTE, 0, 0);
        
        const overnightMinutes = Math.ceil((endOfDay.getTime() - overnightEntryDate.getTime()) / (1000 * 60));
        const overnightHalfHourBlocks = Math.ceil(overnightMinutes / 30);
        const overnightFee = Math.max(overnightHalfHourBlocks * ratePerHalfHour, ratePerHalfHour);
        
        // Calculate current parking fee
        const currentEntryDate = new Date(entry.entryTime);
        const exitDate = new Date(entry.exitTime!);
        const currentMinutes = Math.ceil((exitDate.getTime() - currentEntryDate.getTime()) / (1000 * 60));
        const currentHalfHourBlocks = Math.ceil(currentMinutes / 30);
        const currentParkingFee = Math.max(currentHalfHourBlocks * ratePerHalfHour, ratePerHalfHour);
        
        return {
          hasBreakdown: true,
          overnightFee,
          currentFee: currentParkingFee,
          totalFee: overnightFee + currentParkingFee,
          overnightEntryTime: previousOvernightEntry.entryTime,
          overnightEndTime: endOfDay.toISOString(),
          currentEntryTime: entry.entryTime,
          currentEndTime: entry.exitTime!
        };
      }
    }
    
    return null;
  };

  // Calculate duration between two times
  const calculateDuration = (entryTime: string, exitTime: string) => {
    const entry = new Date(entryTime);
    const exit = new Date(exitTime);
    const minutes = Math.floor((exit.getTime() - entry.getTime()) / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${remainingMinutes}m`;
    }
    return `${remainingMinutes}m`;
  };

  const calculateCurrentDuration = (entryTime: string) => {
    const entry = new Date(entryTime);
    const now = new Date();
    const minutes = Math.floor((now.getTime() - entry.getTime()) / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${remainingMinutes}m`;
    }
    return `${remainingMinutes}m`;
  };

  // Calculate today's revenue only
  const calculateTodaysRevenue = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return entries
      .filter(entry => {
        if (!entry.payment || !entry.exitTime) return false;
        
        const exitDate = new Date(entry.exitTime);
        return exitDate >= today;
      })
      .reduce((sum, entry) => sum + (entry.payment || 0), 0);
  };

  // Calculate monthly statistics
  const calculateMonthlyStats = (monthYear: string) => {
    if (!monthYear) return null;

    const [month, year] = monthYear.split('-');
    const selectedMonth = parseInt(month);
    const selectedYear = parseInt(year);

    const monthlyEntries = entries.filter(entry => {
      if (!entry.exitTime || !entry.payment) return false;
      
      const exitDate = new Date(entry.exitTime);
      return exitDate.getMonth() === selectedMonth && exitDate.getFullYear() === selectedYear;
    });

    if (monthlyEntries.length === 0) return null;

    const totalRevenue = monthlyEntries.reduce((sum, entry) => sum + (entry.payment || 0), 0);
    const totalVehicles = monthlyEntries.length;
    const payments = monthlyEntries.map(entry => entry.payment || 0);
    const maxPayment = Math.max(...payments);
    const minPayment = Math.min(...payments);
    const avgPayment = totalRevenue / totalVehicles;

    return {
      month: new Date(selectedYear, selectedMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      totalRevenue,
      totalVehicles,
      maxPayment,
      minPayment,
      avgPayment,
      entries: monthlyEntries
    };
  };

  // Filter currently parked vehicles based on search (exclude overnight vehicles)
  const getFilteredParkedVehicles = () => {
    const parked = entries.filter(entry => !entry.exitTime && !hasOutstandingOvernightParking(entry));
    
    if (!searchPlate.trim()) {
      return parked;
    }
    
    return parked.filter(entry => 
      entry.plateNumber.toLowerCase().includes(searchPlate.toLowerCase())
    );
  };

  // Get vehicles with outstanding overnight fees
  const getOvernightVehicles = () => {
    console.log("=== Checking for overnight vehicles ===");
    const overnightVehicles = entries.filter(entry => {
      const isOvernight = hasOutstandingOvernightParking(entry);
      if (isOvernight) {
        console.log(`Found overnight vehicle: ${entry.plateNumber} (ID: ${entry.id})`);
      }
      return isOvernight;
    });
    console.log(`Total overnight vehicles found: ${overnightVehicles.length}`);
    return overnightVehicles;
  };

  // Helper to calculate duration from entry time to 5:30 PM same day
  const getOvernightDuration = (entryTime: string) => {
    const entryDate = new Date(entryTime);
    const endOfDay = new Date(entryDate);
    endOfDay.setHours(BUSINESS_END_HOUR, BUSINESS_END_MINUTE, 0, 0);
    const minutes = Math.floor((endOfDay.getTime() - entryDate.getTime()) / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${remainingMinutes}m`;
    }
    return `${remainingMinutes}m`;
  };

  const handleExit = async (entryId: number, plateNumber: string) => {
    try {
      const exitTime = new Date().toISOString();
      const entry = entries.find(e => e.id === entryId);
      
      if (!entry) {
        toast({
          title: "Error",
          description: "Entry not found",
          variant: "destructive",
        });
        return;
      }

      // Calculate actual payment based on exit time, not estimated
      const entryDate = new Date(entry.entryTime);
      const exitDate = new Date(exitTime);
      
      // Check if exit time is after 5:30 PM for overnight parking
      const exitHour = exitDate.getHours();
      const exitMinute = exitDate.getMinutes();
      const exitTimeMinutes = exitHour * 60 + exitMinute;
      const endTime = BUSINESS_END_HOUR * 60 + BUSINESS_END_MINUTE; // 5:30 PM
      const isOvernight = exitTimeMinutes >= endTime;
      
      // Check if this vehicle has outstanding overnight parking from previous entries
      const hasOutstandingOvernight = checkForOutstandingOvernight(plateNumber, entryId);
      
      let payment;
      let overnightFee = 0;
      let currentParkingFee = 0;
      
      if (hasOutstandingOvernight) {
        // Calculate overnight fee from previous entry
        overnightFee = calculateOutstandingOvernightFee(plateNumber, entryId);
        
        // Calculate current parking fee
        const minutes = Math.ceil((exitDate.getTime() - entryDate.getTime()) / (1000 * 60));
        const halfHourBlocks = Math.ceil(minutes / 30);
        currentParkingFee = Math.max(halfHourBlocks * ratePerHalfHour, ratePerHalfHour);
        
        payment = overnightFee + currentParkingFee;
        
        // Debug logging
        console.log(`Vehicle ${plateNumber} exit calculation:`);
        console.log(`- Overnight fee: $${overnightFee.toFixed(2)}`);
        console.log(`- Current fee: $${currentParkingFee.toFixed(2)}`);
        console.log(`- Total payment: $${payment.toFixed(2)}`);
      } else if (isOvernight) {
        // For overnight parking, calculate from entry time to 5:30 PM
        const endOfDay = new Date(entryDate);
        endOfDay.setHours(BUSINESS_END_HOUR, BUSINESS_END_MINUTE, 0, 0);
        
        const minutes = Math.ceil((endOfDay.getTime() - entryDate.getTime()) / (1000 * 60));
        const halfHourBlocks = Math.ceil(minutes / 30);
        payment = Math.max(halfHourBlocks * ratePerHalfHour, ratePerHalfHour);
      } else {
        // Regular parking calculation: from entry time to exit time
        const minutes = Math.ceil((exitDate.getTime() - entryDate.getTime()) / (1000 * 60));
        const halfHourBlocks = Math.ceil(minutes / 30);
        payment = Math.max(halfHourBlocks * ratePerHalfHour, ratePerHalfHour);
      }
      
      // Update the entry with exit time and payment in Supabase
      await parkingService.updateEntry(entryId, {
        exit_time: exitTime,
        payment: payment,
        is_overnight: isOvernight || hasOutstandingOvernight
      });
      
      // If this vehicle had outstanding overnight parking, also mark the previous overnight entry as exited
      if (hasOutstandingOvernight) {
        console.log(`Vehicle ${plateNumber} has outstanding overnight parking, looking for previous entry to mark as exited...`);
        
        const previousOvernightEntry = entries.find(e => {
          if (e.exitTime || e.id === entryId) {
            console.log(`Skipping entry ${e.id} - already exited or is current entry`);
            return false;
          }
          
          const eDate = new Date(e.entryTime);
          const exitDate = new Date(exitTime);
          
          const eDateOnly = new Date(eDate.getFullYear(), eDate.getMonth(), eDate.getDate());
          const exitDateOnly = new Date(exitDate.getFullYear(), exitDate.getMonth(), exitDate.getDate());
          const isPreviousDay = eDateOnly < exitDateOnly;
          
          const entryHour = eDate.getHours();
          const entryMinute = eDate.getMinutes();
          const entryTimeMinutes = entryHour * 60 + entryMinute;
          const endTime = BUSINESS_END_HOUR * 60 + BUSINESS_END_MINUTE;
          const enteredBeforeBusinessEnd = entryTimeMinutes < endTime;
          
          const isOvernightEntry = (isPreviousDay && enteredBeforeBusinessEnd) || (enteredBeforeBusinessEnd && exitDate.getHours() >= BUSINESS_END_HOUR && exitDate.getMinutes() >= BUSINESS_END_MINUTE);
          
          console.log(`Checking entry ${e.id} (${e.plateNumber}): isPreviousDay=${isPreviousDay}, enteredBeforeBusinessEnd=${enteredBeforeBusinessEnd}, isOvernightEntry=${isOvernightEntry}`);
          
          return isOvernightEntry;
        });
        
        if (previousOvernightEntry) {
          console.log(`Found previous overnight entry: ${previousOvernightEntry.plateNumber} (ID: ${previousOvernightEntry.id})`);
          await parkingService.updateEntry(previousOvernightEntry.id, {
            exit_time: exitTime,
            payment: overnightFee,
            is_overnight: true
          });
          
          console.log(`Marked previous overnight entry ${previousOvernightEntry.id} as exited with payment $${overnightFee.toFixed(2)}`);
        } else {
          console.log(`No previous overnight entry found for ${plateNumber}`);
        }
      }
      
      // Reload entries from Supabase
      await loadEntries();
      
      let message;
      if (hasOutstandingOvernight) {
        message = `Vehicle ${plateNumber} has exited. Combined payment: $${payment.toFixed(2)} (Overnight: $${overnightFee.toFixed(2)} + Current: $${currentParkingFee.toFixed(2)})`;
      } else if (isOvernight) {
        message = `Vehicle ${plateNumber} has exited. Overnight parking fee: $${payment.toFixed(2)}`;
      } else {
        message = `Vehicle ${plateNumber} has exited. Payment: $${payment.toFixed(2)}`;
      }
      
      toast({
        title: "Exit Processed",
        description: message,
      });
    } catch (error) {
      console.error('Error processing exit:', error);
      toast({
        title: "Error",
        description: "Failed to process exit",
        variant: "destructive",
      });
    }
  };

  const handleMonthQuery = () => {
    if (!selectedMonth) {
      toast({
        title: "Please select a month",
        description: "Choose a month to view statistics",
        variant: "destructive",
      });
      return;
    }

    const stats = calculateMonthlyStats(selectedMonth);
    setMonthlyStats(stats);

    if (!stats) {
      toast({
        title: "No data found",
        description: `No parking records found for ${selectedMonth.split('-')[0]}/${selectedMonth.split('-')[1]}`,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Monthly Statistics",
        description: `Found ${stats.totalVehicles} vehicles with $${stats.totalRevenue.toFixed(2)} total revenue`,
      });
    }
  };

  // Function to remove a specific vehicle entry
  const removeVehicleEntry = async (plateNumber: string) => {
    try {
      await parkingService.deleteEntriesByPlate(plateNumber);
      const updatedEntries = entries.filter(entry => entry.plateNumber !== plateNumber);
      setEntries(updatedEntries);
      console.log(`Removed all entries for vehicle ${plateNumber}`);
      
      toast({
        title: "Entry Removed",
        description: `All entries for ${plateNumber} have been removed`,
      });
    } catch (error) {
      console.error('Error removing entries:', error);
      toast({
        title: "Error",
        description: "Failed to remove entries",
        variant: "destructive",
      });
    }
  };

  const currentlyParked = entries.filter(entry => !entry.exitTime && !hasOutstandingOvernightParking(entry));
  const filteredParkedVehicles = getFilteredParkedVehicles();
  const overnightVehicles = getOvernightVehicles();
  const todaysRevenue = calculateTodaysRevenue();
  const filteredOvernightVehicles = overnightVehicles.filter(entry =>
    entry.plateNumber.toLowerCase().includes(overnightSearch.toLowerCase())
  );

  // Generate month options for the last 12 months
  const getMonthOptions = () => {
    const options = [];
    const now = new Date();
    
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const month = date.getMonth();
      const year = date.getFullYear();
      const monthYear = `${month}-${year}`;
      const label = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      
      options.push({ value: monthYear, label });
    }
    
    return options;
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="shadow-card bg-gradient-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Currently Parked</p>
                <p className="text-3xl font-bold text-primary">{currentlyParked.length}</p>
              </div>
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                <Users className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="shadow-card bg-gradient-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Today's Revenue</p>
                <p className="text-3xl font-bold text-success">${todaysRevenue.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">
                  Today's completed transactions only
                </p>
              </div>
              <div className="w-12 h-12 bg-success/10 rounded-full flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="shadow-card bg-gradient-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Rate</p>
                <p className="text-3xl font-bold text-foreground">${ratePerHalfHour}/30min</p>
              </div>
              <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center">
                <Clock className="w-6 h-6 text-accent" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Query Section */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Monthly Revenue Query
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Label htmlFor="monthSelect">Select Month</Label>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a month" />
                  </SelectTrigger>
                  <SelectContent>
                    {getMonthOptions().map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button 
                onClick={handleMonthQuery}
                disabled={!selectedMonth}
                className="bg-gradient-primary hover:shadow-elegant transition-all duration-300"
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                Query Statistics
              </Button>
            </div>

            {monthlyStats && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-800">Total Revenue</span>
                    </div>
                    <p className="text-2xl font-bold text-blue-600">${monthlyStats.totalRevenue.toFixed(2)}</p>
                  </CardContent>
                </Card>

                <Card className="bg-green-50 border-green-200">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Car className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-medium text-green-800">Total Vehicles</span>
                    </div>
                    <p className="text-2xl font-bold text-green-600">{monthlyStats.totalVehicles}</p>
                  </CardContent>
                </Card>

                <Card className="bg-orange-50 border-orange-200">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-orange-600" />
                      <span className="text-sm font-medium text-orange-800">Highest Payment</span>
                    </div>
                    <p className="text-2xl font-bold text-orange-600">${monthlyStats.maxPayment.toFixed(2)}</p>
                  </CardContent>
                </Card>

                <Card className="bg-red-50 border-red-200">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <TrendingDown className="w-4 h-4 text-red-600" />
                      <span className="text-sm font-medium text-red-800">Lowest Payment</span>
                    </div>
                    <p className="text-2xl font-bold text-red-600">${monthlyStats.minPayment.toFixed(2)}</p>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Overnight Parking Section */}
      <Card className="shadow-card bg-gradient-card">
        <CardHeader>
          <CardTitle>Overnight Parking - Outstanding Fees</CardTitle>
          <div className="flex gap-2 mt-2">
            <Input
              placeholder="Search by plate number..."
              value={overnightSearch}
              onChange={e => setOvernightSearch(e.target.value)}
              className="w-48"
            />
            <Button onClick={() => setOvernightSearch("")}>Clear</Button>
          </div>
        </CardHeader>
        <CardContent>
          {filteredOvernightVehicles.length === 0 ? (
            <div className="text-muted-foreground">No outstanding overnight fees found.</div>
          ) : (
            filteredOvernightVehicles.map(entry => (
              <div 
                key={entry.id} 
                className="flex items-center justify-between p-4 border border-orange-200 rounded-lg bg-white"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center">
                    <Car className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-lg">{entry.plateNumber}</p>
                    <p className="text-sm text-muted-foreground">
                      Entered: {new Date(entry.entryTime).toLocaleString()}
                    </p>
                    <p className="text-xs text-orange-600 font-medium">
                      Overnight parking - Charged until 5:30 PM
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <Badge variant="secondary" className="mb-1 bg-orange-100 text-orange-800">
                      {getOvernightDuration(entry.entryTime)}
                    </Badge>
                    <p className="text-sm font-bold text-orange-600">
                      Outstanding: ${calculateOutstandingFee(entry).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Currently Parked Vehicles */}
      <Card className="shadow-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Car className="w-5 h-5" />
              Currently Parked Vehicles
              {searchPlate && (
                <Badge variant="secondary" className="ml-2">
                  {filteredParkedVehicles.length} found
                </Badge>
              )}
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search plate number..."
                  value={searchPlate}
                  onChange={(e) => setSearchPlate(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {currentlyParked.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Car className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No vehicles currently parked</p>
            </div>
          ) : filteredParkedVehicles.length === 0 && searchPlate ? (
            <div className="text-center py-8 text-muted-foreground">
              <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No vehicles found matching "{searchPlate}"</p>
              <Button 
                variant="outline" 
                onClick={() => setSearchPlate("")}
                className="mt-2"
              >
                Clear Search
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredParkedVehicles.map((entry) => {
                const isOvernight = hasOutstandingOvernightParking(entry);
                return (
                  <div 
                    key={entry.id} 
                    className={`flex items-center justify-between p-4 border rounded-lg bg-card hover:shadow-md transition-shadow ${
                      isOvernight ? 'border-orange-200 bg-orange-50' : ''
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        isOvernight ? 'bg-orange-500' : 'bg-gradient-primary'
                      }`}>
                        <Car className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-lg">{entry.plateNumber}</p>
                        <p className="text-sm text-muted-foreground">
                          Entered: {new Date(entry.entryTime).toLocaleString()}
                        </p>
                        {isOvernight && (
                          <p className="text-xs text-orange-600 font-medium">
                            Overnight parking - Charged until 5:30 PM
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <Badge variant="secondary" className="mb-1">
                          {calculateCurrentDuration(entry.entryTime)}
                        </Badge>
                        <p className={`text-sm ${isOvernight ? 'text-orange-600 font-bold' : 'text-muted-foreground'}`}>
                          {isOvernight ? 'Overnight Fee: ' : 'Est. '}${calculateOutstandingFee(entry).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Exits */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Recent Exits</CardTitle>
        </CardHeader>
        <CardContent>
          {entries.filter(entry => entry.exitTime).length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              <p>No exit records yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {entries
                .filter(entry => entry.exitTime)
                .sort((a, b) => new Date(b.exitTime!).getTime() - new Date(a.exitTime!).getTime())
                .slice(0, 5)
                .map((entry) => {
                  const breakdown = calculateExitFeeBreakdown(entry);
                  return (
                    <div 
                      key={entry.id} 
                      className="flex items-center justify-between p-3 border rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="font-semibold">{entry.plateNumber}</div>
                        <div className="text-sm text-muted-foreground">
                          <div>Entry: {new Date(entry.entryTime).toLocaleString()}</div>
                          <div>Exit: {new Date(entry.exitTime!).toLocaleString()}</div>
                          <div className="text-xs text-blue-600">
                            Duration: {calculateDuration(entry.entryTime, entry.exitTime!)}
                          </div>
                          {breakdown && (
                            <div className="text-xs text-orange-600 mt-1">
                              <div>Overnight: {new Date(breakdown.overnightEntryTime).toLocaleDateString()} {new Date(breakdown.overnightEntryTime).toLocaleTimeString()} - {new Date(breakdown.overnightEndTime).toLocaleTimeString()}</div>
                              <div>Current: {new Date(breakdown.currentEntryTime).toLocaleDateString()} {new Date(breakdown.currentEntryTime).toLocaleTimeString()} - {new Date(breakdown.currentEndTime).toLocaleTimeString()}</div>
                            </div>
                          )}
                        </div>
                        {(entry.isOvernight || breakdown) && (
                          <Badge variant="outline" className="bg-orange-100 text-orange-800 text-xs whitespace-nowrap">
                            {breakdown ? 'Combined' : 'Overnight'}
                          </Badge>
                        )}
                      </div>
                      <div className="text-right">
                        {breakdown ? (
                          <div className="text-xs text-muted-foreground">
                            <div>Overnight: BND ${breakdown.overnightFee.toFixed(2)}</div>
                            <div>Current: BND ${breakdown.currentFee.toFixed(2)}</div>
                            <div className="font-bold text-success">Total: BND ${breakdown.totalFee.toFixed(2)}</div>
                          </div>
                        ) : (
                          <Badge variant="outline" className="bg-success text-success-foreground">
                            BND ${entry.payment}
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}; 