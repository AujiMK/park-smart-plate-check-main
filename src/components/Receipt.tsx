import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Receipt as ReceiptIcon, Car, Clock, DollarSign, Check, AlertTriangle } from "lucide-react";

interface ReceiptData {
  plateNumber: string;
  entryTime: string;
  exitTime: string;
  payment: number;
  duration: string;
  receiptId: string;
  isOvernight?: boolean;
  breakdown?: {
    hasBreakdown: boolean;
    overnightBreakdown?: Array<{
      entryTime: string;
      endTime: string;
      fee: number;
    }>;
    overnightTotal?: number;
    currentFee?: number;
    totalFee: number;
    currentEntryTime?: string;
    currentEndTime?: string;
  };
}

interface ReceiptProps {
  data: ReceiptData;
  onClose: () => void;
}

export const Receipt = ({ data, onClose }: ReceiptProps) => {
  // Calculate duration breakdown by day
  const calculateDurationBreakdown = () => {
    if (!data.breakdown?.hasBreakdown) {
      return null;
    }

    const breakdown = [];
    
    // Add outstanding parking periods
    if (data.breakdown.overnightBreakdown) {
      data.breakdown.overnightBreakdown.forEach((period, index) => {
        const entryDate = new Date(period.entryTime);
        const endDate = new Date(period.endTime);
        const durationMs = endDate.getTime() - entryDate.getTime();
        const hours = Math.floor(durationMs / (1000 * 60 * 60));
        const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
        
        breakdown.push({
          date: entryDate.toLocaleDateString(),
          startTime: entryDate.toLocaleTimeString(),
          endTime: endDate.toLocaleTimeString(),
          duration: hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`,
          fee: period.fee,
          type: 'Outstanding'
        });
      });
    }
    
    // Add current parking period
    if (data.breakdown.currentFee && data.breakdown.currentEntryTime && data.breakdown.currentEndTime) {
      const entryDate = new Date(data.breakdown.currentEntryTime);
      const endDate = new Date(data.breakdown.currentEndTime);
      const durationMs = endDate.getTime() - entryDate.getTime();
      const hours = Math.floor(durationMs / (1000 * 60 * 60));
      const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
      
      breakdown.push({
        date: entryDate.toLocaleDateString(),
        startTime: entryDate.toLocaleTimeString(),
        endTime: endDate.toLocaleTimeString(),
        duration: hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`,
        fee: data.breakdown.currentFee,
        type: 'Current'
      });
    }
    
    return breakdown;
  };

  const durationBreakdown = calculateDurationBreakdown();

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md shadow-2xl animate-fade-in">
        <CardHeader className="text-center bg-gradient-primary text-white rounded-t-lg">
          <div className="mx-auto w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mb-2">
            <ReceiptIcon className="w-6 h-6 text-white" />
          </div>
          <CardTitle className="text-2xl">Payment Receipt</CardTitle>
          <p className="text-white/80">Transaction completed successfully</p>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            {/* Receipt ID */}
            <div className="text-center mb-4">
              <p className="text-sm text-muted-foreground">Receipt ID</p>
              <p className="font-mono font-bold text-lg">{data.receiptId}</p>
            </div>

            {/* Outstanding Parking Notice */}
            {data.isOvernight && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-orange-600" />
                  <span className="font-medium text-orange-800">Outstanding Parking</span>
                </div>
                <p className="text-sm text-orange-700">
                  This vehicle was charged for outstanding parking until 5:30 PM.
                </p>
              </div>
            )}

            {/* Vehicle Information */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Car className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">License Plate:</span>
                </div>
                <span className="font-bold text-lg">{data.plateNumber}</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">Entry Time:</span>
                </div>
                <span>{new Date(data.entryTime).toLocaleString()}</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">Exit Time:</span>
                </div>
                <span>{new Date(data.exitTime).toLocaleString()}</span>
              </div>

              {/* Duration Breakdown */}
              {durationBreakdown ? (
                <div className="space-y-2">
                  <span className="font-medium">Duration Breakdown:</span>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-2">
                    {durationBreakdown.map((period, index) => (
                      <div key={index} className="text-sm">
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-gray-700">{period.type}:</span>
                          <span className="font-semibold">{period.duration}</span>
                        </div>
                        <div className="text-xs text-gray-600 ml-4">
                          {period.date} {period.startTime} - {period.endTime}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="font-medium">Duration:</span>
                  <span className="font-semibold">{data.duration}</span>
                </div>
              )}
            </div>

            <Separator />

            {/* Payment Information */}
            <div className="space-y-2">
              {data.breakdown?.hasBreakdown ? (
                <div className="space-y-3">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <DollarSign className="w-4 h-4 text-blue-600" />
                      <span className="font-medium text-blue-800">Fee Breakdown</span>
                    </div>
                    <div className="space-y-2 text-sm">
                      {data.breakdown.overnightBreakdown && data.breakdown.overnightBreakdown.map((period, index) => (
                        <div key={index} className="mb-2">
                          <div className="flex justify-between">
                            <span className="text-blue-700">Outstanding Fee:</span>
                            <span className="font-medium">BND ${period.fee.toFixed(2)}</span>
                          </div>
                          <div className="text-xs text-blue-600 ml-4">
                            {new Date(period.entryTime).toLocaleDateString()} {new Date(period.entryTime).toLocaleTimeString()} - {new Date(period.endTime).toLocaleTimeString()}
                          </div>
                        </div>
                      ))}
                      {data.breakdown.currentFee && data.breakdown.currentFee > 0 && (
                        <>
                          <div className="flex justify-between">
                            <span className="text-blue-700">Current Fee:</span>
                            <span className="font-medium">BND ${data.breakdown.currentFee.toFixed(2)}</span>
                          </div>
                          <div className="text-xs text-blue-600 ml-4">
                            {data.breakdown.currentEntryTime && new Date(data.breakdown.currentEntryTime).toLocaleDateString()} {data.breakdown.currentEntryTime && new Date(data.breakdown.currentEntryTime).toLocaleTimeString()} - {data.breakdown.currentEndTime && new Date(data.breakdown.currentEndTime).toLocaleTimeString()}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between border-t border-blue-200 pt-2">
                    <span className="font-bold text-blue-800">Total Amount:</span>
                    <span className="text-2xl font-bold text-blue-800">BND ${data.breakdown.totalFee.toFixed(2)}</span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="font-medium">Total Amount:</span>
                  <span className={`text-2xl font-bold ${data.isOvernight ? 'text-orange-600' : 'text-success'}`}>
                    BND ${data.payment.toFixed(2)}
                  </span>
                </div>
              )}
              
              {data.isOvernight && !data.breakdown?.hasBreakdown && (
                <p className="text-xs text-muted-foreground text-center">
                  Outstanding parking fee charged until 5:30 PM
                </p>
              )}
            </div>

            {/* Success Message */}
            <div className="flex items-center justify-center gap-2 text-success font-medium">
              <Check className="w-5 h-5" />
              <span>Payment Successful</span>
            </div>

            <Button 
              onClick={onClose}
              className="w-full bg-gradient-primary hover:shadow-elegant transition-all duration-300"
            >
              Close Receipt
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};