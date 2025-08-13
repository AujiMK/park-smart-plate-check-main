import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Car, Clock, AlertCircle, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { parkingService } from "@/lib/supabase";

interface ParkingEntryProps {
  onEntryAdded: () => void;
}

export const ParkingEntry = ({ onEntryAdded }: ParkingEntryProps) => {
  const [plateNumber, setPlateNumber] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Business hours: 8:30 AM - 5:30 PM
  const BUSINESS_START_HOUR = 8;
  const BUSINESS_START_MINUTE = 30;
  const BUSINESS_END_HOUR = 17;
  const BUSINESS_END_MINUTE = 30;

  // Sanitize plate number input
  const sanitizePlateNumber = (input: string) => {
    return input.replace(/[^A-Za-z0-9\-]/g, '').toUpperCase();
  };

  // Validate plate number format
  const validatePlateNumber = (plate: string) => {
    if (!plate.trim()) {
      return { isValid: false, message: "Please enter a plate number" };
    }
    
    if (plate.length < 3) {
      return { isValid: false, message: "Plate number must be at least 3 characters" };
    }
    
    if (plate.length > 10) {
      return { isValid: false, message: "Plate number is too long" };
    }
    
    return { isValid: true, message: "" };
  };

  // Check if current time is within business hours
  const isWithinBusinessHours = () => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = currentHour * 60 + currentMinute;
    
    const startTime = BUSINESS_START_HOUR * 60 + BUSINESS_START_MINUTE; // 8:30 AM
    const endTime = BUSINESS_END_HOUR * 60 + BUSINESS_END_MINUTE; // 5:30 PM
    
    return currentTime >= startTime && currentTime <= endTime;
  };

  // Check if vehicle has outstanding parking (entered before 5:30 PM and still parked after 5:30 PM)
  const hasOutstandingParking = async (plateNumber: string) => {
    try {
      const existingEntries = await parkingService.getAllEntries();
      const vehicleEntries = existingEntries.filter(
        (entry: any) => entry.plate_number.toLowerCase() === plateNumber.toLowerCase()
      );

      if (vehicleEntries.length === 0) return false;

      // Check if the last entry is still parked and was entered before 5:30 PM
      const lastEntry = vehicleEntries[vehicleEntries.length - 1];
      
      if (!lastEntry.exit_time) {
        // Still parked - check if it was entered before 5:30 PM
        const entry = new Date(lastEntry.entry_time);
        const now = new Date();
        
        // Check if it's from previous day
        const entryDateOnly = new Date(entry.getFullYear(), entry.getMonth(), entry.getDate());
        const currentDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const isPreviousDay = entryDateOnly < currentDateOnly;
        
        const entryHour = entry.getHours();
        const entryMinute = entry.getMinutes();
        const entryTimeMinutes = entryHour * 60 + entryMinute;
        
        const endTime = BUSINESS_END_HOUR * 60 + BUSINESS_END_MINUTE; // 5:30 PM
        const enteredBeforeBusinessEnd = entryTimeMinutes < endTime;
        
        // Consider outstanding if:
        // 1. Previous day: any vehicle from previous day still parked AND entered before 5:30 PM
        // 2. Same day: entered before 5:30 PM and currently after 5:30 PM
        return (isPreviousDay && enteredBeforeBusinessEnd) || (enteredBeforeBusinessEnd && now.getHours() >= BUSINESS_END_HOUR && now.getMinutes() >= BUSINESS_END_MINUTE);
      }
      
      return false;
    } catch (error) {
      console.error('Error checking outstanding parking:', error);
      return false;
    }
  };

  // Check if vehicle can re-enter after outstanding parking
  const canReenterAfterOutstanding = async (plateNumber: string) => {
    try {
      const existingEntries = await parkingService.getAllEntries();
      const vehicleEntries = existingEntries.filter(
        (entry: any) => entry.plate_number.toLowerCase() === plateNumber.toLowerCase()
      );

      if (vehicleEntries.length === 0) return true;

      // Check if the last entry is still parked
      const lastEntry = vehicleEntries[vehicleEntries.length - 1];
      
      if (!lastEntry.exit_time) {
        // Still parked - check if it's outstanding
        if (await hasOutstandingParking(plateNumber)) {
          // Check if it's the next day after 8:30 AM
          const now = new Date();
          const currentHour = now.getHours();
          const currentMinute = now.getMinutes();
          const currentTime = currentHour * 60 + currentMinute;
          const startTime = BUSINESS_START_HOUR * 60 + BUSINESS_START_MINUTE; // 8:30 AM
          
          // Allow re-entry if it's after 8:30 AM next day
          const canReenter = currentTime >= startTime;
          
          // For debugging - log the values
          console.log(`Vehicle ${plateNumber}: currentTime=${currentTime}, startTime=${startTime}, canReenter=${canReenter}`);
          
          return canReenter;
        }
        
        // If it's not outstanding parking, don't allow re-entry
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error checking re-entry status:', error);
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const sanitizedPlate = sanitizePlateNumber(plateNumber);
    const validation = validatePlateNumber(sanitizedPlate);
    
    if (!validation.isValid) {
      toast({
        title: "Invalid Plate Number",
        description: validation.message,
        variant: "destructive",
      });
      return;
    }

    // Check business hours (but allow outstanding vehicles to re-enter after 8:30 AM)
          const isOutstandingVehicle = await hasOutstandingParking(sanitizedPlate);
    
          if (!isWithinBusinessHours() && !isOutstandingVehicle) {
      toast({
        title: "Outside Business Hours",
        description: "Parking entry is only allowed between 8:30 AM and 5:30 PM",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const existingEntries = await parkingService.getAllEntries();
      
      // Check if vehicle is already parked (but allow outstanding vehicles to re-enter)
      const alreadyParked = existingEntries.find(
        (entry: any) => entry.plate_number.toLowerCase() === sanitizedPlate.toLowerCase() && !entry.exit_time
      );

              if (alreadyParked) {
          // Check if this is an outstanding vehicle that can re-enter
          if (await hasOutstandingParking(sanitizedPlate)) {
            // Allow outstanding vehicles to re-enter after 8:30 AM
          const now = new Date();
          const currentHour = now.getHours();
          const currentMinute = now.getMinutes();
          const currentTime = currentHour * 60 + currentMinute;
          const startTime = BUSINESS_START_HOUR * 60 + BUSINESS_START_MINUTE; // 8:30 AM
          
          if (currentTime >= startTime) {
            // Allow re-entry for outstanding vehicles after 8:30 AM
            console.log(`Allowing re-entry for outstanding vehicle ${sanitizedPlate}`);
          } else {
            toast({
              title: "Outstanding Parking Restriction",
              description: `Vehicle ${sanitizedPlate} can re-enter after 8:30 AM. Current time: ${now.toLocaleTimeString()}`,
              variant: "destructive",
            });
            setIsLoading(false);
            return;
          }
        } else {
          // Regular parked vehicle - block re-entry
          toast({
            title: "Vehicle Already Parked",
            description: `Vehicle ${sanitizedPlate} is already in the parking area. Please log out first before re-entering.`,
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }
      }

      // Overnight parking restrictions are now handled in the alreadyParked check above

      // Check if this plate number has a recent exit (within last 5 minutes) to prevent rapid re-entry
      const recentExit = existingEntries.find(
        (entry: any) => {
          if (entry.plate_number.toLowerCase() === sanitizedPlate.toLowerCase() && entry.exit_time) {
            const exitTime = new Date(entry.exit_time);
            const now = new Date();
            const timeDiff = now.getTime() - exitTime.getTime();
            return timeDiff < 5 * 60 * 1000; // 5 minutes
          }
          return false;
        }
      );

      if (recentExit) {
        toast({
          title: "Recent Exit Detected",
          description: `Vehicle ${sanitizedPlate} recently exited. Please wait a moment before re-entering.`,
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // Create new entry in Supabase
      const newEntry = {
        plate_number: sanitizedPlate,
        entry_time: new Date().toISOString(),
        exit_time: null,
        payment: null,
        is_overnight: false
      };

      console.log('Creating new entry:', newEntry);
      const createdEntry = await parkingService.createEntry(newEntry);
      console.log('Entry created successfully:', createdEntry);

      toast({
        title: "Entry Successful",
        description: `Vehicle ${sanitizedPlate} has been logged for parking`,
      });

      setPlateNumber("");
      onEntryAdded();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to log entry. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlateNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sanitized = sanitizePlateNumber(e.target.value);
    setPlateNumber(sanitized);
  };

  const getCurrentBusinessStatus = () => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = currentHour * 60 + currentMinute;
    
    const startTime = BUSINESS_START_HOUR * 60 + BUSINESS_START_MINUTE;
    const endTime = BUSINESS_END_HOUR * 60 + BUSINESS_END_MINUTE;
    
    if (currentTime < startTime) {
      return "Closed - Opens at 8:30 AM";
    } else if (currentTime > endTime) {
      return "Closed - Opens tomorrow at 8:30 AM";
    } else {
      return "Open - Closes at 5:30 PM";
    }
  };

  return (
    <Card className="w-full max-w-md shadow-card bg-gradient-card">
      <CardHeader className="text-center">
        <div className="mx-auto w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center mb-2">
          <Car className="w-6 h-6 text-white" />
        </div>
        <CardTitle className="text-2xl">Vehicle Entry</CardTitle>
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Calendar className="w-4 h-4" />
          <span>{getCurrentBusinessStatus()}</span>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="plateNumber">License Plate Number</Label>
            <Input
              id="plateNumber"
              type="text"
              placeholder="Enter plate number (e.g., ABC-123)"
              value={plateNumber}
              onChange={handlePlateNumberChange}
              className="text-center font-mono text-lg"
              disabled={isLoading || !isWithinBusinessHours()}
              maxLength={10}
            />
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <AlertCircle className="w-3 h-3" />
              <span>Only letters, numbers, and hyphens allowed</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>Entry Time: {new Date().toLocaleString()}</span>
          </div>

          <Button 
            type="submit" 
            className="w-full bg-gradient-primary hover:shadow-elegant transition-all duration-300"
            disabled={isLoading || !isWithinBusinessHours()}
          >
            {isLoading ? "Logging Entry..." : "Log Entry"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};