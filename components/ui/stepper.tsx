import * as React from "react";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface StepperProps extends React.HTMLAttributes<HTMLDivElement> {
  steps: Array<{
    title: string;
    description?: string;
  }>;
  currentStep: number;
  orientation?: "horizontal" | "vertical";
}

const Stepper = React.forwardRef<HTMLDivElement, StepperProps>(
  (
    { className, steps, currentStep, orientation = "horizontal", ...props },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex",
          orientation === "horizontal" ? "flex-row items-center" : "flex-col",
          className
        )}
        {...props}
      >
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isCompleted = stepNumber < currentStep;
          const isCurrent = stepNumber === currentStep;
          const isUpcoming = stepNumber > currentStep;

          return (
            <React.Fragment key={index}>
              <div
                className={cn(
                  "flex items-center",
                  orientation === "vertical" ? "flex-row" : "flex-col"
                )}
              >
                {/* Step Circle */}
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-medium transition-colors",
                    isCompleted &&
                      "border-primary bg-primary text-primary-foreground",
                    isCurrent && "border-primary bg-background text-primary",
                    isUpcoming &&
                      "border-muted-foreground/25 bg-background text-muted-foreground"
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <span>{stepNumber}</span>
                  )}
                </div>

                {/* Step Content */}
                {orientation === "horizontal" && (
                  <div className="mt-2 text-center">
                    <div
                      className={cn(
                        "text-sm font-medium",
                        isCurrent && "text-foreground",
                        isCompleted && "text-foreground",
                        isUpcoming && "text-muted-foreground"
                      )}
                    >
                      {step.title}
                    </div>
                    {step.description && (
                      <div className="text-xs text-muted-foreground">
                        {step.description}
                      </div>
                    )}
                  </div>
                )}

                {orientation === "vertical" && (
                  <div className="ml-4 min-w-0 flex-1">
                    <div
                      className={cn(
                        "text-sm font-medium",
                        isCurrent && "text-foreground",
                        isCompleted && "text-foreground",
                        isUpcoming && "text-muted-foreground"
                      )}
                    >
                      {step.title}
                    </div>
                    {step.description && (
                      <div className="text-xs text-muted-foreground">
                        {step.description}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "flex-1",
                    orientation === "horizontal"
                      ? "mx-4 h-px bg-border"
                      : "ml-5 my-4 w-px bg-border"
                  )}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    );
  }
);

Stepper.displayName = "Stepper";

interface StepProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
  isCompleted?: boolean;
  isCurrent?: boolean;
}

const Step = React.forwardRef<HTMLDivElement, StepProps>(
  (
    { className, title, description, isCompleted, isCurrent, ...props },
    ref
  ) => {
    return (
      <div ref={ref} className={cn("space-y-2", className)} {...props}>
        <div className="flex items-center space-x-2">
          <div
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm",
              isCompleted &&
                "border-primary bg-primary text-primary-foreground",
              isCurrent && "border-primary bg-background text-primary",
              !isCompleted &&
                !isCurrent &&
                "border-muted-foreground/25 text-muted-foreground"
            )}
          >
            {isCompleted ? <Check className="h-4 w-4" /> : "•"}
          </div>
          <div>
            <div
              className={cn(
                "text-sm font-medium",
                isCurrent && "text-foreground",
                isCompleted && "text-foreground",
                !isCompleted && !isCurrent && "text-muted-foreground"
              )}
            >
              {title}
            </div>
            {description && (
              <div className="text-xs text-muted-foreground">{description}</div>
            )}
          </div>
        </div>
      </div>
    );
  }
);

Step.displayName = "Step";

export { Stepper, Step };
