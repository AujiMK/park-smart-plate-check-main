import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Car, Shield, Search } from "lucide-react";

interface InterfaceSelectorProps {
  onSelectInterface: (type: 'staff' | 'user') => void;
}

export const InterfaceSelector = ({ onSelectInterface }: InterfaceSelectorProps) => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-gradient-primary shadow-elegant">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <Car className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Smart Parking System</h1>
              <p className="text-white/80">Choose your access level</p>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Welcome to Smart Parking</h2>
            <p className="text-xl text-muted-foreground">Please select the appropriate interface</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Staff Interface */}
            <Card className="shadow-elegant bg-gradient-card hover:shadow-card transition-all duration-300 cursor-pointer group">
              <CardHeader className="text-center">
                <div className="mx-auto w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                  <Shield className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-2xl">Staff Interface</CardTitle>
                <p className="text-muted-foreground">For parking attendants and administrators</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <span>Log vehicle entries</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <span>Manage parking dashboard</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <span>Process vehicle exits</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <span>View revenue reports</span>
                  </div>
                </div>
                
                <Button 
                  onClick={() => onSelectInterface('staff')}
                  className="w-full bg-gradient-primary hover:shadow-elegant transition-all duration-300 mt-6"
                  size="lg"
                >
                  <Users className="w-5 h-5 mr-2" />
                  Access Staff Dashboard
                </Button>
              </CardContent>
            </Card>

            {/* User Interface */}
            <Card className="shadow-elegant bg-gradient-card hover:shadow-card transition-all duration-300 cursor-pointer group">
              <CardHeader className="text-center">
                <div className="mx-auto w-16 h-16 bg-secondary rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                  <Car className="w-8 h-8 text-secondary-foreground" />
                </div>
                <CardTitle className="text-2xl">Customer Interface</CardTitle>
                <p className="text-muted-foreground">For vehicle owners and customers</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-2 h-2 bg-secondary rounded-full"></div>
                    <span>Search your vehicle</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-2 h-2 bg-secondary rounded-full"></div>
                    <span>View parking duration</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-2 h-2 bg-secondary rounded-full"></div>
                    <span>Calculate parking fees</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-2 h-2 bg-secondary rounded-full"></div>
                    <span>Self-service payment & exit</span>
                  </div>
                </div>
                
                <Button 
                  onClick={() => onSelectInterface('user')}
                  className="w-full bg-secondary hover:bg-secondary/90 transition-all duration-300 mt-6"
                  size="lg"
                >
                  <Search className="w-5 h-5 mr-2" />
                  Find My Vehicle
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="text-center mt-12">
            <div className="bg-muted/50 rounded-lg p-6">
              <h3 className="font-semibold mb-2">Parking Rates</h3>
              <p className="text-2xl font-bold text-primary">$0.50 per 30 minutes</p>
              <p className="text-sm text-muted-foreground mt-1">Minimum charge: 30 minutes</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};