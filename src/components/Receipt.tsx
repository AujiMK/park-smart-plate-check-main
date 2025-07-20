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
    overnightFee?: number;
    currentFee?: number;
    totalFee: number;
    overnightEntryTime?: string;
    overnightEndTime?: string;
    currentEntryTime?: string;
    currentEndTime?: string;
  };
}

interface ReceiptProps {
  data: ReceiptData;
  onClose: () => void;
}

export const Receipt = ({ data, onClose }: ReceiptProps) => {
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

            {/* Overnight Parking Notice */}
            {data.isOvernight && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-orange-600" />
                  <span className="font-medium text-orange-800">Overnight Parking</span>
                </div>
                <p className="text-sm text-orange-700">
                  This vehicle was charged for overnight parking until 5:30 PM.
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

              <div className="flex items-center justify-between">
                <span className="font-medium">Duration:</span>
                <span className="font-semibold">{data.duration}</span>
              </div>
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
                      <div className="flex justify-between">
                        <span className="text-blue-700">Overnight Fee:</span>
                        <span className="font-medium">BND ${data.breakdown.overnightFee?.toFixed(2)}</span>
                      </div>
                      <div className="text-xs text-blue-600 ml-4">
                        {data.breakdown.overnightEntryTime && new Date(data.breakdown.overnightEntryTime).toLocaleDateString()} {data.breakdown.overnightEntryTime && new Date(data.breakdown.overnightEntryTime).toLocaleTimeString()} - {data.breakdown.overnightEndTime && new Date(data.breakdown.overnightEndTime).toLocaleTimeString()}
                      </div>
                      <div className="flex justify-between">
                        <span className="text-blue-700">Current Fee:</span>
                        <span className="font-medium">BND ${data.breakdown.currentFee?.toFixed(2)}</span>
                      </div>
                      <div className="text-xs text-blue-600 ml-4">
                        {data.breakdown.currentEntryTime && new Date(data.breakdown.currentEntryTime).toLocaleDateString()} {data.breakdown.currentEntryTime && new Date(data.breakdown.currentEntryTime).toLocaleTimeString()} - {data.breakdown.currentEndTime && new Date(data.breakdown.currentEndTime).toLocaleTimeString()}
                      </div>
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
                  Overnight parking fee charged until 5:30 PM
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