import { useState } from "react";
import { InterfaceSelector } from "@/components/InterfaceSelector";
import { StaffInterface } from "@/components/StaffInterface";
import { UserInterface } from "@/components/UserInterface";
import { Button } from "@/components/ui/button";
import { Car, ArrowLeft } from "lucide-react";

type InterfaceType = 'selector' | 'staff' | 'user';

const Index = () => {
  const [currentInterface, setCurrentInterface] = useState<InterfaceType>('selector');

  const handleSelectInterface = (type: 'staff' | 'user') => {
    setCurrentInterface(type);
  };

  const handleBack = () => {
    setCurrentInterface('selector');
  };

  if (currentInterface === 'selector') {
    return <InterfaceSelector onSelectInterface={handleSelectInterface} />;
  }

  if (currentInterface === 'staff') {
    return <StaffInterface onBack={handleBack} />;
  }

  if (currentInterface === 'user') {
    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="bg-secondary shadow-elegant">
          <div className="container mx-auto px-4 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                  <Car className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white">Customer Portal</h1>
                  <p className="text-white/80">Find your vehicle and pay parking fees</p>
                </div>
              </div>
              <Button 
                onClick={handleBack} 
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
          <UserInterface />
        </div>
      </div>
    );
  }

  return null;
};

export default Index;
