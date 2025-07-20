import { useState } from "react";
import { ParkingEntry } from "./ParkingEntry";
import { ParkingDashboard } from "./ParkingDashboard";
import { Button } from "@/components/ui/button";
import { Car, Gauge, ArrowLeft } from "lucide-react";

interface StaffInterfaceProps {
  onBack: () => void;
}

export const StaffInterface = ({ onBack }: StaffInterfaceProps) => {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleEntryAdded = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-gradient-primary shadow-elegant">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <Car className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Staff Dashboard</h1>
                <p className="text-white/80">Parking management system</p>
              </div>
            </div>
            <Button 
              onClick={onBack} 
              variant="outline" 
              className="text-white border-white/20 hover:bg-white/10"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Main
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Entry Section */}
          <div className="lg:col-span-1">
            <div className="sticky top-8">
              <ParkingEntry onEntryAdded={handleEntryAdded} />
            </div>
          </div>
          
          {/* Dashboard Section */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-6">
              <Gauge className="w-5 h-5 text-primary" />
              <h2 className="text-2xl font-bold">Parking Dashboard</h2>
            </div>
            <ParkingDashboard refreshTrigger={refreshTrigger} />
          </div>
        </div>
      </div>
    </div>
  );
};