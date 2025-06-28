    "use client";

    import type React from "react";

    import { useState } from "react";
    import { Check } from "lucide-react";
    import { cn } from "@/lib/utils";
    import { Button } from "@/components/ui/button";
    import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
    CardTitle,
    } from "@/components/ui/card";

    interface Step {
    id: string;
    title: string;
    description: string;
    component: React.ReactNode;
    }

    interface MultiStepWizardProps {
    steps: Step[];
    onComplete: () => void;
    }

    export function MultiStepWizard({ steps, onComplete }: MultiStepWizardProps) {
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [completedSteps, setCompletedSteps] = useState<string[]>([]);

    const currentStep = steps[currentStepIndex];
    const isFirstStep = currentStepIndex === 0;
    const isLastStep = currentStepIndex === steps.length - 1;

    const handleNext = () => {
        if (isLastStep) {
        onComplete();
        return;
        }

        // Mark current step as completed
        if (!completedSteps.includes(currentStep.id)) {
        setCompletedSteps([...completedSteps, currentStep.id]);
        }

        setCurrentStepIndex(currentStepIndex + 1);
    };

    const handlePrevious = () => {
        if (!isFirstStep) {
        setCurrentStepIndex(currentStepIndex - 1);
        }
    };

    const handleStepClick = (index: number) => {
        // Only allow clicking on completed steps or the next available step
        if (
        completedSteps.includes(steps[index].id) ||
        index === 0 ||
        (index <= completedSteps.length && index === currentStepIndex + 1)
        ) {
        setCurrentStepIndex(index);
        }
    };

    return (
        <div className="space-y-4">
        {/* Stepper progress bar with continuous line */}
        <div className="relative mb-8 px-2">
            {/* Gray background line */}
            <div
            className="absolute left-0 w-full h-1 bg-gray-200 z-0"
            style={{ top: "calc(50% - 1rem)" }} // manually align behind the circles
            />

            {/* Green progress line */}
            <div
            className="absolute left-0 h-1 bg-green-500 z-10 transition-all"
            style={{
                top: "calc(50% - 1rem)",
                width: `${(100 * (currentStepIndex + 1)) / steps.length}%`,
            }}
            />
            {/* Step circles and labels */}
            <div className="flex items-center justify-between relative z-20">
            {steps.map((step, index) => {
                const isCompleted =
                completedSteps.includes(step.id) || index < currentStepIndex;
                const isCurrent = index === currentStepIndex;
                const isClickable =
                isCompleted ||
                index === 0 ||
                (index <= completedSteps.length &&
                    index === currentStepIndex + 1);

                return (
                <div
                    key={step.id}
                    className="flex-1 flex flex-col items-center min-w-[80px]"
                >
                    {/* Step circle */}
                    <div
                    className={cn(
                        "flex items-center justify-center w-9 h-9 rounded-full border-2 transition-colors",
                        isCompleted || isCurrent
                        ? "bg-green-500 border-green-500 text-white"
                        : "bg-gray-100 border-gray-300 text-gray-400",
                        isClickable ? "cursor-pointer" : "cursor-not-allowed"
                    )}
                    onClick={() => isClickable && handleStepClick(index)}
                    style={{ zIndex: 30 }}
                    >
                    {isCompleted || isCurrent ? (
                        <Check className="h-5 w-5" />
                    ) : (
                        <span className="text-base font-semibold">{index + 1}</span>
                    )}
                    </div>
                    {/* Step title */}
                    <div className="mt-2 text-center">
                    <span
                        className={cn(
                        "text-sm font-medium",
                        isCurrent || isCompleted
                            ? "text-green-600"
                            : "text-gray-400"
                        )}
                    >
                        {step.title}
                    </span>
                    </div>
                </div>
                );
            })}
            </div>
        </div>

        <Card>
            <CardHeader className="pb-3">
            <CardTitle>{currentStep.title}</CardTitle>
            </CardHeader>
            <CardContent>{currentStep.component}</CardContent>
            <CardFooter className="flex justify-between pt-2">
            <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={isFirstStep}
            >
                Previous
            </Button>
            <Button onClick={handleNext}>
                {isLastStep ? "Complete" : "Next"}
            </Button>
            </CardFooter>
        </Card>
        </div>
    );
    }
