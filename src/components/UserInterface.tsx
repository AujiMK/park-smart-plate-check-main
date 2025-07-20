import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Search, Car, Clock, DollarSign, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Receipt } from "./Receipt";

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
  const { toast } = useToast();

  const ratePerHalfHour = 0.50;
  const BUSINESS_END_HOUR = 17;
  const BUSINESS_END_MINUTE = 30;

  // Check if vehicle has outstanding overnight parking from previous entries
  const checkForOutstandingOvernight = (plateNumber: string, currentEntryId: number) => {
    const entries = JSON.parse(localStorage.getItem("parkingEntries") || "[]");
    const vehicleEntries = entries.filter(
      (entry: ParkingEntry) => entry.plateNumber.toLowerCase() === plateNumber.toLowerCase() && entry.id !== currentEntryId
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
    const entries = JSON.parse(localStorage.getItem("parkingEntries") || "[]");
    const vehicleEntries = entries.filter(
      (entry: ParkingEntry) => entry.plateNumber.toLowerCase() === plateNumber.toLowerCase() && entry.id !== currentEntryId
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

  // Check if vehicle has outstanding overnight parking (entered before 5:30 PM and still parked after 5:30 PM)
  const hasOutstandingOvernightParking = (entry: ParkingEntry) => {
    if (entry.exitTime) return false; // Already exited
    
    const entryDate = new Date(entry.entryTime);
    const now = new Date();
    
    // Check if it's currently after 5:30 PM
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = currentHour * 60 + currentMinute;
    const endTime = BUSINESS_END_HOUR * 60 + BUSINESS_END_MINUTE; // 5:30 PM
    
    // Only consider overnight if it's currently after 5:30 PM
    if (currentTime < endTime) return false;
    
    // Check if vehicle entered before 5:30 PM
    const entryHour = entryDate.getHours();
    const entryMinute = entryDate.getMinutes();
    const entryTimeMinutes = entryHour * 60 + entryMinute;
    
    return entryTimeMinutes < endTime; // Entered before 5:30 PM and currently after 5:30 PM
  };

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

  const calculateFeeBreakdown = (entry: ParkingEntry) => {
    const entryDate = new Date(entry.entryTime);
    const now = new Date();
    
    // Check if this vehicle has outstanding overnight parking from previous entries
    const hasOutstandingOvernight = checkForOutstandingOvernight(entry.plateNumber, entry.id);
    
    if (hasOutstandingOvernight) {
      // Get the previous overnight entry for breakdown
      const entries = JSON.parse(localStorage.getItem("parkingEntries") || "[]");
      const vehicleEntries = entries.filter(
        (e: ParkingEntry) => e.plateNumber.toLowerCase() === entry.plateNumber.toLowerCase() && e.id !== entry.id
      );
      
      const previousOvernightEntry = vehicleEntries.find(e => {
        if (e.exitTime) return false;
        
        const eDate = new Date(e.entryTime);
        const entryDateOnly = new Date(eDate.getFullYear(), eDate.getMonth(), eDate.getDate());
        const currentDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const isPreviousDay = entryDateOnly < currentDateOnly;
        
        const entryHour = eDate.getHours();
        const entryMinute = eDate.getMinutes();
        const entryTimeMinutes = entryHour * 60 + entryMinute;
        const endTime = BUSINESS_END_HOUR * 60 + BUSINESS_END_MINUTE;
        const enteredBeforeBusinessEnd = entryTimeMinutes < endTime;
        
        return (isPreviousDay && enteredBeforeBusinessEnd) || (enteredBeforeBusinessEnd && now.getHours() >= BUSINESS_END_HOUR && now.getMinutes() >= BUSINESS_END_MINUTE);
      });
      
      if (previousOvernightEntry) {
        const overnightEntryDate = new Date(previousOvernightEntry.entryTime);
        const endOfDay = new Date(overnightEntryDate);
        endOfDay.setHours(BUSINESS_END_HOUR, BUSINESS_END_MINUTE, 0, 0);
        
        const overnightMinutes = Math.ceil((endOfDay.getTime() - overnightEntryDate.getTime()) / (1000 * 60));
        const overnightHalfHourBlocks = Math.ceil(overnightMinutes / 30);
        const overnightFee = Math.max(overnightHalfHourBlocks * ratePerHalfHour, ratePerHalfHour);
        
        // Calculate current parking fee
        const currentMinutes = Math.ceil((now.getTime() - entryDate.getTime()) / (1000 * 60));
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
          currentEndTime: now.toISOString()
        };
      }
    }
    
    // Regular calculation (no breakdown needed)
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = currentHour * 60 + currentMinute;
    const endTime = BUSINESS_END_HOUR * 60 + BUSINESS_END_MINUTE;
    const isCurrentlyAfterBusinessHours = currentTime >= endTime;
    
    const entryHour = entryDate.getHours();
    const entryMinute = entryDate.getMinutes();
    const entryTimeMinutes = entryHour * 60 + entryMinute;
    const enteredBeforeBusinessEnd = entryTimeMinutes < endTime;
    
    if (isCurrentlyAfterBusinessHours && enteredBeforeBusinessEnd) {
      // Overnight parking: calculate from entry time to 5:30 PM
      const endOfDay = new Date(entryDate);
      endOfDay.setHours(BUSINESS_END_HOUR, BUSINESS_END_MINUTE, 0, 0);
      
      const minutes = Math.ceil((endOfDay.getTime() - entryDate.getTime()) / (1000 * 60));
      const halfHourBlocks = Math.ceil(minutes / 30);
      const fee = Math.max(halfHourBlocks * ratePerHalfHour, ratePerHalfHour);
      
      return {
        hasBreakdown: false,
        totalFee: fee,
        entryTime: entry.entryTime,
        endTime: endOfDay.toISOString()
      };
    } else {
      // Regular parking calculation: from entry time to current time
      const minutes = Math.ceil((now.getTime() - entryDate.getTime()) / (1000 * 60));
      const halfHourBlocks = Math.ceil(minutes / 30);
      const fee = Math.max(halfHourBlocks * ratePerHalfHour, ratePerHalfHour);
      
      return {
        hasBreakdown: false,
        totalFee: fee,
        entryTime: entry.entryTime,
        endTime: now.toISOString()
      };
    }
  };

  const calculateCurrentFee = (entry: ParkingEntry) => {
    const breakdown = calculateFeeBreakdown(entry);
    return breakdown.totalFee;
  };

  const handleSearch = () => {
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
      const entries = JSON.parse(localStorage.getItem("parkingEntries") || "[]");
      // Find the most recent entry for this vehicle that hasn't exited
      const vehicleEntries = entries.filter(
        (entry: ParkingEntry) => 
          entry.plateNumber.toLowerCase() === plateNumber.toLowerCase() && !entry.exitTime
      );

      if (vehicleEntries.length > 0) {
        // Get the most recent entry
        const found = vehicleEntries[vehicleEntries.length - 1];
        setSearchResult(found);
        
        // Check if this vehicle has outstanding overnight parking
        const hasOutstandingOvernight = checkForOutstandingOvernight(plateNumber, found.id);
        const isOvernight = hasOutstandingOvernight || hasOutstandingOvernightParking(found);
        
        const message = isOvernight 
          ? `Found parking record for ${plateNumber.toUpperCase()}. Includes overnight charges.`
          : `Found parking record for ${plateNumber.toUpperCase()}`;
        
        toast({
          title: "Vehicle Found",
          description: message,
        });
      } else {
        setSearchResult(null);
        toast({
          title: "Not Found",
          description: "No active parking record found for this vehicle",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to search records",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleExit = () => {
    if (!searchResult) return;

    const exitTime = new Date().toISOString();
    const payment = calculatePayment(searchResult.entryTime, exitTime);
    const isOvernight = hasOutstandingOvernightParking(searchResult);
    
    try {
      const entries = JSON.parse(localStorage.getItem("parkingEntries") || "[]");
      const updatedEntries = entries.map((entry: ParkingEntry) => 
        entry.id === searchResult.id 
          ? { ...entry, exitTime, payment, isOvernight }
          : entry
      );
      
      localStorage.setItem("parkingEntries", JSON.stringify(updatedEntries));
      
      // Prepare receipt data
      const breakdown = calculateFeeBreakdown(searchResult);
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
      
      const message = isOvernight 
        ? `Exit successful. Overnight parking fee: $${payment}`
        : `Exit successful. Total fee: $${payment}`;
      
      toast({
        title: "Payment Processed",
        description: message,
      });
    } catch (error) {
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
              <span>Rate: $0.50 per 30 minutes</span>
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
                    {calculateCurrentDuration(searchResult.entryTime)}
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
                    <span className={`text-xl font-bold ${hasOutstandingOvernightParking(searchResult) || checkForOutstandingOvernight(searchResult.plateNumber, searchResult.id) ? 'text-orange-600' : 'text-success'}`}>
                      ${calculateCurrentFee(searchResult).toFixed(2)}
                    </span>
                  </div>
                  {(hasOutstandingOvernightParking(searchResult) || checkForOutstandingOvernight(searchResult.plateNumber, searchResult.id)) && (
                    <div className="text-xs text-orange-600">
                      Includes overnight charges
                    </div>
                  )}
                </div>
              </div>

              {/* Fee Breakdown */}
              {(() => {
                const breakdown = calculateFeeBreakdown(searchResult);
                if (breakdown.hasBreakdown) {
                  return (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <DollarSign className="w-4 h-4 text-blue-600" />
                        <span className="font-medium text-blue-800">Fee Breakdown</span>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-blue-700">Overnight Fee:</span>
                          <span className="font-medium">BND ${breakdown.overnightFee.toFixed(2)}</span>
                        </div>
                        <div className="text-xs text-blue-600 ml-4">
                          {new Date(breakdown.overnightEntryTime).toLocaleDateString()} {new Date(breakdown.overnightEntryTime).toLocaleTimeString()} - {new Date(breakdown.overnightEndTime).toLocaleTimeString()}
                        </div>
                        <div className="flex justify-between">
                          <span className="text-blue-700">Current Fee:</span>
                          <span className="font-medium">BND ${breakdown.currentFee.toFixed(2)}</span>
                        </div>
                        <div className="text-xs text-blue-600 ml-4">
                          {new Date(breakdown.currentEntryTime).toLocaleDateString()} {new Date(breakdown.currentEntryTime).toLocaleTimeString()} - {new Date(breakdown.currentEndTime).toLocaleTimeString()}
                        </div>
                        <div className="border-t border-blue-200 pt-2 mt-2">
                          <div className="flex justify-between font-bold">
                            <span className="text-blue-800">Total Fee:</span>
                            <span className="text-blue-800">BND ${breakdown.totalFee.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

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
                className={`w-full text-lg py-6 transition-all duration-300 ${
                  hasOutstandingOvernightParking(searchResult) || checkForOutstandingOvernight(searchResult.plateNumber, searchResult.id)
                    ? 'bg-orange-500 hover:bg-orange-600'
                    : 'bg-gradient-primary hover:shadow-elegant'
                }`}
              >
                <DollarSign className="w-5 h-5 mr-2" />
                {hasOutstandingOvernightParking(searchResult) || checkForOutstandingOvernight(searchResult.plateNumber, searchResult.id) ? 'Pay Combined Fee' : 'Pay & Exit'} - BND ${calculateCurrentFee(searchResult).toFixed(2)}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};