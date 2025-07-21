import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Search, Car, Clock, DollarSign, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Receipt } from "./Receipt";
import { parkingService, ParkingEntry as SupabaseParkingEntry } from "@/lib/supabase";

interface ParkingEntry {
  id: number;
  plateNumber: string;
  entryTime: string;
  exitTime: string | null;
  payment: number | null;
  isOvernight?: boolean;
}

export const UserInterface = () => {
  const [plateNumber, setPlateNumber] = useState("");
  const [searchResult, setSearchResult] = useState<ParkingEntry | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);
  const [currentFee, setCurrentFee] = useState<number>(0);
  const [feeBreakdown, setFeeBreakdown] = useState<any>(null);
  const [hasOutstandingOvernight, setHasOutstandingOvernight] = useState<boolean>(false);
  const [isLoadingFee, setIsLoadingFee] = useState<boolean>(false);
  const { toast } = useToast();

  const ratePerHalfHour = 0.50; // BND$0.50 per 30 minutes
  const BUSINESS_END_HOUR = 17;
  const BUSINESS_END_MINUTE = 30;

  // Calculate fee based on duration in minutes
  const calculateFeeFromDuration = (minutes: number) => {
    const halfHourBlocks = Math.ceil(minutes / 30);
    return Math.max(halfHourBlocks * ratePerHalfHour, ratePerHalfHour);
  };

  // Transform Supabase entry to local interface
  const transformSupabaseEntry = (entry: SupabaseParkingEntry): ParkingEntry => ({
    id: entry.id,
    plateNumber: entry.plate_number,
    entryTime: entry.entry_time,
    exitTime: entry.exit_time,
    payment: entry.payment,
    isOvernight: entry.is_overnight
  });

  // Load fee data when search result changes
  const loadFeeData = async (entry: ParkingEntry) => {
    setIsLoadingFee(true);
    try {
      const [fee, breakdown, outstanding] = await Promise.all([
        calculateCurrentFee(entry),
        calculateFeeBreakdown(entry),
        checkForOutstandingOvernight(entry.plateNumber, entry.id)
      ]);
      
      console.log('Fee calculation results:', {
        fee,
        breakdown,
        outstanding,
        entryTime: entry.entryTime,
        currentTime: new Date().toISOString()
      });
      
      setCurrentFee(fee);
      setFeeBreakdown(breakdown);
      setHasOutstandingOvernight(outstanding);
    } catch (error) {
      console.error('Error loading fee data:', error);
    } finally {
      setIsLoadingFee(false);
    }
  };

  // Check if vehicle has outstanding overnight parking from previous entries
  const checkForOutstandingOvernight = async (plateNumber: string, currentEntryId: number) => {
    try {
      const entries = await parkingService.getAllEntries();
      const vehicleEntries = entries.filter(
        (entry: SupabaseParkingEntry) => entry.plate_number.toLowerCase() === plateNumber.toLowerCase() && entry.id !== currentEntryId
      );
      
      if (vehicleEntries.length === 0) return false;
      
      // Check if there's a previous entry that's still parked and is overnight
      const previousOvernightEntry = vehicleEntries.find(entry => {
        if (entry.exit_time) return false; // Already exited
        
        const entryDate = new Date(entry.entry_time);
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
    } catch (error) {
      console.error('Error checking outstanding overnight:', error);
      return false;
    }
  };

  // Calculate outstanding overnight fee for a specific vehicle
  const calculateOutstandingOvernightFee = async (plateNumber: string, currentEntryId: number) => {
    try {
      const entries = await parkingService.getAllEntries();
      const vehicleEntries = entries.filter(
        (entry: SupabaseParkingEntry) => entry.plate_number.toLowerCase() === plateNumber.toLowerCase() && entry.id !== currentEntryId
      );
      
      if (vehicleEntries.length === 0) return 0;
      
      // Find the previous overnight entry
      const previousOvernightEntry = vehicleEntries.find(entry => {
        if (entry.exit_time) return false;
        
        const entryDate = new Date(entry.entry_time);
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
      const entryDate = new Date(previousOvernightEntry.entry_time);
      const endOfDay = new Date(entryDate);
      endOfDay.setHours(BUSINESS_END_HOUR, BUSINESS_END_MINUTE, 0, 0);
      
      const minutes = Math.ceil((endOfDay.getTime() - entryDate.getTime()) / (1000 * 60));
      const halfHourBlocks = Math.ceil(minutes / 30);
      return Math.max(halfHourBlocks * ratePerHalfHour, ratePerHalfHour);
    } catch (error) {
      console.error('Error calculating outstanding overnight fee:', error);
      return 0;
    }
  };

  // Check if vehicle has outstanding overnight parking (entered before 5:30 PM and still parked after 5:30 PM)
  const hasOutstandingOvernightParking = (entry: ParkingEntry) => {
    if (entry.exitTime) return false; // Already exited
    
    const entryDate = new Date(entry.entryTime);
    const now = new Date();
    
    // Check if vehicle entered before 5:30 PM
    const entryHour = entryDate.getHours();
    const entryMinute = entryDate.getMinutes();
    const entryTimeMinutes = entryHour * 60 + entryMinute;
    const endTime = BUSINESS_END_HOUR * 60 + BUSINESS_END_MINUTE; // 5:30 PM
    const enteredBeforeBusinessEnd = entryTimeMinutes < endTime;
    
    // Check if it's been more than 24 hours since entry
    const timeDiff = now.getTime() - entryDate.getTime();
    const hoursDiff = timeDiff / (1000 * 60 * 60);
    const hasBeenOvernight = hoursDiff >= 24;
    
    // Consider overnight if:
    // 1. Vehicle entered before 5:30 PM AND has been parked for more than 24 hours, OR
    // 2. Vehicle entered before 5:30 PM AND it's currently after 5:30 PM
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = currentHour * 60 + currentMinute;
    const isCurrentlyAfterBusinessHours = currentTime >= endTime;
    
    return enteredBeforeBusinessEnd && (hasBeenOvernight || isCurrentlyAfterBusinessHours);
  };

  const calculatePayment = async (entryTime: string, exitTime: string, plateNumber: string) => {
    const entryDate = new Date(entryTime);
    const exitDate = new Date(exitTime);
    
    // Check if this is overnight parking
    const entryHour = entryDate.getHours();
    const entryMinute = entryDate.getMinutes();
    const entryTimeMinutes = entryHour * 60 + entryMinute;
    const endTime = BUSINESS_END_HOUR * 60 + BUSINESS_END_MINUTE; // 5:30 PM
    const enteredBeforeBusinessEnd = entryTimeMinutes < endTime;
    
    // Check if it's been more than 24 hours since entry
    const timeDiff = exitDate.getTime() - entryDate.getTime();
    const hoursDiff = timeDiff / (1000 * 60 * 60);
    const hasBeenOvernight = hoursDiff >= 24;
    
    if (enteredBeforeBusinessEnd && (hasBeenOvernight || exitDate.getHours() >= BUSINESS_END_HOUR)) {
      // For overnight parking, calculate from entry time to 5:30 PM
      const endOfDay = new Date(entryDate);
      endOfDay.setHours(BUSINESS_END_HOUR, BUSINESS_END_MINUTE, 0, 0);
      
      const overnightMinutes = Math.ceil((endOfDay.getTime() - entryDate.getTime()) / (1000 * 60));
      const overnightFee = calculateFeeFromDuration(overnightMinutes);
      
      // Check if there's a fresh entry for this vehicle on the next day
      const entries = await parkingService.getAllEntries();
      const nextDayEntries = entries.filter((e: SupabaseParkingEntry) => {
        if (e.plate_number.toLowerCase() !== plateNumber.toLowerCase()) return false;
        
        const entryDateOnly = new Date(entryDate.getFullYear(), entryDate.getMonth(), entryDate.getDate());
        const eDate = new Date(e.entry_time);
        const eDateOnly = new Date(eDate.getFullYear(), eDate.getMonth(), eDate.getDate());
        
        // Check if this entry is on the next day
        const nextDay = new Date(entryDateOnly);
        nextDay.setDate(nextDay.getDate() + 1);
        
        return eDateOnly.getTime() === nextDay.getTime();
      });
      
      // Find the earliest entry on the next day (fresh entry)
      const freshEntry = nextDayEntries.length > 0 
        ? nextDayEntries.reduce((earliest, current) => 
            new Date(current.entry_time) < new Date(earliest.entry_time) ? current : earliest
          )
        : null;
      
      let currentFeeStartTime;
      if (freshEntry) {
        // Use the fresh entry time
        currentFeeStartTime = new Date(freshEntry.entry_time);
      } else {
        // Use 8:30 AM next day as default
        const nextDayStart = new Date(entryDate);
        nextDayStart.setDate(nextDayStart.getDate() + 1);
        nextDayStart.setHours(8, 30, 0, 0); // 8:30 AM next day
        currentFeeStartTime = nextDayStart;
      }
      
      const currentMinutes = Math.ceil((exitDate.getTime() - currentFeeStartTime.getTime()) / (1000 * 60));
      const currentFee = calculateFeeFromDuration(currentMinutes);
      
      return overnightFee + currentFee;
    } else {
      // Regular parking calculation
      const totalMinutes = Math.ceil((exitDate.getTime() - entryDate.getTime()) / (1000 * 60));
      return calculateFeeFromDuration(totalMinutes);
    }
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

  const calculateFeeBreakdown = async (entry: ParkingEntry) => {
    const now = new Date();
    // Fetch all entries for this plate
    const entries = await parkingService.getAllEntries();
    const vehicleEntries = entries.filter(
      (e: SupabaseParkingEntry) => e.plate_number.toLowerCase() === entry.plateNumber.toLowerCase()
    );

    // Find all outstanding overnight entries (no exit, entered before 5:30 PM, and either previous day or still after 5:30 PM)
    const overnightRecords = vehicleEntries.filter(e => {
      if (e.exit_time) return false;
      const entryDate = new Date(e.entry_time);
      const entryHour = entryDate.getHours();
      const entryMinute = entryDate.getMinutes();
      const entryTimeMinutes = entryHour * 60 + entryMinute;
      const endTime = BUSINESS_END_HOUR * 60 + BUSINESS_END_MINUTE;
      const enteredBeforeBusinessEnd = entryTimeMinutes < endTime;
      const entryDateOnly = new Date(entryDate.getFullYear(), entryDate.getMonth(), entryDate.getDate());
      const nowDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const isPreviousDay = entryDateOnly < nowDateOnly;
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const currentTime = currentHour * 60 + currentMinute;
      const isCurrentlyAfterBusinessHours = currentTime >= endTime;
      return (isPreviousDay && enteredBeforeBusinessEnd) || (enteredBeforeBusinessEnd && isCurrentlyAfterBusinessHours);
    });

    // For each overnight record, calculate fee and time range
    const overnightBreakdown = overnightRecords.map(e => {
      const entryDate = new Date(e.entry_time);
      const overnightEnd = new Date(entryDate);
      overnightEnd.setHours(BUSINESS_END_HOUR, BUSINESS_END_MINUTE, 0, 0);
      const overnightMinutes = Math.ceil((overnightEnd.getTime() - entryDate.getTime()) / (1000 * 60));
      const overnightFee = calculateFeeFromDuration(overnightMinutes);
      return {
        entryTime: entryDate.toISOString(),
        endTime: overnightEnd.toISOString(),
        fee: overnightFee
      };
    });

    // Sum all overnight fees
    const overnightTotal = overnightBreakdown.reduce((sum, o) => sum + o.fee, 0);

    // Check for a fresh entry for today (after all overnight entries)
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const freshEntry = vehicleEntries.find(e => {
      if (e.exit_time) return false;
      const entryDate = new Date(e.entry_time);
      const entryDateOnly = new Date(entryDate.getFullYear(), entryDate.getMonth(), entryDate.getDate());
      return entryDateOnly.getTime() === today.getTime();
    });
    let currentFee = 0;
    let currentFeeStartTime = null;
    let currentFeeEndTime = null;
    if (freshEntry) {
      currentFeeStartTime = new Date(freshEntry.entry_time);
      currentFeeEndTime = now;
      const currentMinutes = Math.ceil((now.getTime() - currentFeeStartTime.getTime()) / (1000 * 60));
      currentFee = calculateFeeFromDuration(currentMinutes);
    }

    return {
      hasBreakdown: true,
      overnightBreakdown,
      overnightTotal,
      currentFee,
      totalFee: overnightTotal + currentFee,
      currentEntryTime: currentFeeStartTime ? currentFeeStartTime.toISOString() : null,
      currentEndTime: currentFeeEndTime ? currentFeeEndTime.toISOString() : null
    };
  };

  const calculateCurrentFee = async (entry: ParkingEntry) => {
    const breakdown = await calculateFeeBreakdown(entry);
    return breakdown.totalFee;
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

  // Helper to determine if entry is overnight
  const isOvernightEntry = (entry: ParkingEntry) => {
    if (!entry) return false;
    const entryDate = new Date(entry.entryTime);
    const entryHour = entryDate.getHours();
    const entryMinute = entryDate.getMinutes();
    const entryTimeMinutes = entryHour * 60 + entryMinute;
    const endTime = BUSINESS_END_HOUR * 60 + BUSINESS_END_MINUTE;
    const enteredBeforeBusinessEnd = entryTimeMinutes < endTime;
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = currentHour * 60 + currentMinute;
    const isCurrentlyAfterBusinessHours = currentTime >= endTime;
    const entryDateOnly = new Date(entryDate.getFullYear(), entryDate.getMonth(), entryDate.getDate());
    const nowDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const isPreviousDay = entryDateOnly < nowDateOnly;
    return (isPreviousDay && enteredBeforeBusinessEnd) || (enteredBeforeBusinessEnd && isCurrentlyAfterBusinessHours);
  };

  const handleSearch = async () => {
    if (!plateNumber.trim()) {
      toast({
        title: "Error",
        description: "Please enter a valid plate number",
        variant: "destructive",
      });
      return;
    }

    setIsSearching(true);

    try {
      const entries = await parkingService.getAllEntries();
      // Find the most recent entry for this vehicle that hasn't exited
      const vehicleEntries = entries.filter(
        (entry: SupabaseParkingEntry) => 
          entry.plate_number.toLowerCase() === plateNumber.toLowerCase() && !entry.exit_time
      );

      if (vehicleEntries.length > 0) {
        // Get the most recent entry
        const found = vehicleEntries[vehicleEntries.length - 1];
        const transformedEntry = transformSupabaseEntry(found);
        setSearchResult(transformedEntry);
        
        // Load fee data
        await loadFeeData(transformedEntry);
        
        // Check if this vehicle has outstanding overnight parking
        const hasOutstandingOvernight = await checkForOutstandingOvernight(plateNumber, found.id);
        const isOvernight = hasOutstandingOvernight || hasOutstandingOvernightParking(transformedEntry);
        
        const message = isOvernight 
          ? `Found parking record for ${plateNumber.toUpperCase()}. Includes overnight charges.`
          : `Found parking record for ${plateNumber.toUpperCase()}`;
        
        toast({
          title: "Vehicle Found",
          description: message,
        });
      } else {
        setSearchResult(null);
        setCurrentFee(0);
        setFeeBreakdown(null);
        setHasOutstandingOvernight(false);
        toast({
          title: "Not Found",
          description: "No active parking record found for this vehicle",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error searching for vehicle:', error);
      toast({
        title: "Error",
        description: "Failed to search records",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleExit = async () => {
    if (!searchResult) return;

    const exitTime = new Date().toISOString();
    const payment = await calculatePayment(searchResult.entryTime, exitTime, searchResult.plateNumber);
    const isOvernight = hasOutstandingOvernightParking(searchResult);
    
    try {
      // Update the entry in the database
      await parkingService.updateEntry(searchResult.id, {
        exit_time: exitTime,
        payment: payment,
        is_overnight: isOvernight
      });
      
      // Prepare receipt data
      const breakdown = await calculateFeeBreakdown(searchResult);
      const receipt = {
        plateNumber: searchResult.plateNumber,
        entryTime: searchResult.entryTime,
        exitTime,
        payment,
        duration: calculateCurrentDuration(searchResult.entryTime),
        receiptId: `RCP-${Date.now()}`,
        isOvernight,
        breakdown,
      };
      
      setReceiptData(receipt);
      setShowReceipt(true);
      setSearchResult(null);
      setPlateNumber("");
      setCurrentFee(0);
      setFeeBreakdown(null);
      setHasOutstandingOvernight(false);
      
      const message = isOvernight 
        ? `Exit successful. Overnight parking fee: $${payment.toFixed(2)}`
        : `Exit successful. Total fee: $${payment.toFixed(2)}`;
      
      toast({
        title: "Payment Processed",
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

  if (showReceipt && receiptData) {
    return (
      <Receipt 
        data={receiptData} 
        onClose={() => {
          setShowReceipt(false);
          setReceiptData(null);
        }} 
      />
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Search Section */}
      <Card className="shadow-card bg-gradient-card">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center mb-2">
            <Search className="w-6 h-6 text-white" />
          </div>
          <CardTitle className="text-2xl">Find Your Vehicle</CardTitle>
          <p className="text-muted-foreground">Enter your license plate to check parking status and pay</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="searchPlate">License Plate Number</Label>
              <div className="flex gap-2">
                <Input
                  id="searchPlate"
                  type="text"
                  placeholder="Enter plate number (e.g., ABC-123)"
                  value={plateNumber}
                  onChange={(e) => setPlateNumber(e.target.value)}
                  className="text-center font-mono text-lg"
                  disabled={isSearching}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
                <Button 
                  onClick={handleSearch}
                  disabled={isSearching}
                  className="bg-gradient-primary hover:shadow-elegant transition-all duration-300"
                >
                  <Search className="w-4 h-4 mr-2" />
                  {isSearching ? "Searching..." : "Search"}
                </Button>
              </div>
            </div>
            
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
              <DollarSign className="w-4 h-4" />
              <span>Rate: BND$0.50 per 30 minutes</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search Result */}
      {searchResult && (
        <Card className="shadow-card animate-fade-in">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Car className="w-5 h-5" />
              Vehicle Found
              {hasOutstandingOvernightParking(searchResult) && (
                <Badge variant="outline" className="bg-orange-100 text-orange-800">
                  Overnight Parking
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">License Plate</Label>
                  <p className="text-2xl font-bold">{searchResult.plateNumber}</p>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Parking Duration</Label>
                  <Badge variant="secondary" className="text-lg px-3 py-1">
                    <span className="ml-2 bg-green-100 text-green-700 rounded-full px-3 py-1 text-xs font-semibold">
                      {isOvernightEntry(searchResult) ? getOvernightDuration(searchResult.entryTime) : calculateCurrentDuration(searchResult.entryTime)}
                    </span>
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Entry Time</Label>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span>{new Date(searchResult.entryTime).toLocaleString()}</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Current Fee</Label>
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-success" />
                    {isLoadingFee ? (
                      <span className="text-xl font-bold text-muted-foreground">Loading...</span>
                    ) : (
                      <span className={`text-xl font-bold ${hasOutstandingOvernightParking(searchResult) || hasOutstandingOvernight ? 'text-orange-600' : 'text-success'}`}>
                        ${currentFee.toFixed(2)}
                      </span>
                    )}
                  </div>
                  {(hasOutstandingOvernightParking(searchResult) || hasOutstandingOvernight) && (
                    <div className="text-xs text-orange-600">
                      Includes overnight charges
                    </div>
                  )}
                </div>
              </div>

              {/* Fee Breakdown */}
              {feeBreakdown && feeBreakdown.hasBreakdown && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <DollarSign className="w-4 h-4 text-blue-600" />
                    <span className="font-medium text-blue-800">Fee Breakdown</span>
                  </div>
                  <div className="space-y-2 text-sm">
                    {feeBreakdown.overnightBreakdown.map((o: any, index: number) => (
                      <div key={index} className="flex flex-col mb-1">
                        <div className="flex justify-between items-center">
                          <span className="text-blue-700">Overnight Fee:</span>
                          <span className="font-medium">BND ${o.fee.toFixed(2)}</span>
                        </div>
                        <div className="text-xs text-blue-600 ml-4">
                          {new Date(o.entryTime).toLocaleDateString()} {new Date(o.entryTime).toLocaleTimeString()} - {new Date(o.endTime).toLocaleTimeString()} 
                          <span className="ml-2">({getOvernightDuration(o.entryTime)})</span>
                        </div>
                      </div>
                    ))}
                    {feeBreakdown.currentFee > 0 && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-blue-700">Current Fee:</span>
                          <span className="font-medium">BND ${feeBreakdown.currentFee.toFixed(2)}</span>
                        </div>
                        <div className="text-xs text-blue-600 ml-4">
                          {new Date(feeBreakdown.currentEntryTime).toLocaleDateString()} {new Date(feeBreakdown.currentEntryTime).toLocaleTimeString()} - {new Date(feeBreakdown.currentEndTime).toLocaleTimeString()}
                        </div>
                      </>
                    )}
                    <div className="border-t border-blue-200 pt-2 mt-2">
                      <div className="flex justify-between font-bold">
                        <span className="text-blue-800">Total Fee:</span>
                        <span className="text-blue-800">BND ${feeBreakdown.totalFee.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {hasOutstandingOvernightParking(searchResult) && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-4 h-4 text-orange-600" />
                    <span className="font-medium text-orange-800">Overnight Parking Notice</span>
                  </div>
                  <p className="text-sm text-orange-700">
                    This vehicle entered before 5:30 PM and is charged for overnight parking until 5:30 PM.
                  </p>
                </div>
              )}

              <Button 
                onClick={handleExit}
                disabled={isLoadingFee}
                className={`w-full text-lg py-6 transition-all duration-300 ${
                  hasOutstandingOvernightParking(searchResult) || hasOutstandingOvernight
                    ? 'bg-orange-500 hover:bg-orange-600'
                    : 'bg-gradient-primary hover:shadow-elegant'
                }`}
              >
                <DollarSign className="w-5 h-5 mr-2" />
                {hasOutstandingOvernightParking(searchResult) || hasOutstandingOvernight ? 'Pay Combined Fee' : 'Pay & Exit'} - BND ${currentFee.toFixed(2)}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};