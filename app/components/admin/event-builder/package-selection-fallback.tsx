import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Package, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { PackageSelectionFallbackProps } from "@/app/types/event-builder";

export function PackageSelectionFallback({
  onSelect,
  initialPackageId,
}: PackageSelectionFallbackProps) {
  return (
    <div className="space-y-6">
      <Alert className="mb-6">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Package data unavailable</AlertTitle>
        <AlertDescription>
          We're having trouble loading the package data. Please try again later
          or contact support if the issue persists.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="overflow-hidden transition-all opacity-60">
            <div className="relative h-40 w-full bg-gradient-to-r from-gray-50 to-gray-100 animate-pulse">
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="h-6 w-32 bg-gray-200 rounded mb-2"></div>
                <div className="h-8 w-24 bg-gray-200 rounded"></div>
              </div>
            </div>
            <CardHeader className="pb-2">
              <div className="h-4 w-full bg-gray-200 rounded"></div>
            </CardHeader>
            <CardContent className="pb-2">
              <div className="space-y-3">
                <div className="h-4 w-3/4 bg-gray-200 rounded"></div>
                <div className="space-y-2">
                  <div className="h-4 w-1/2 bg-gray-200 rounded"></div>
                  <div className="h-4 w-full bg-gray-200 rounded"></div>
                  <div className="h-4 w-full bg-gray-200 rounded"></div>
                  <div className="h-4 w-full bg-gray-200 rounded"></div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button className="w-full" variant="outline" disabled>
                <Package size={16} className="mr-2" />
                Select Package
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
