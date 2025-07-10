"use client";

import { useState, useRef, useEffect } from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface CircularTimePickerProps {
  value: string; // Format: "HH:MM"
  onChange: (time: string) => void;
  label?: ReactNode;
  className?: string;
  hasConflict?: boolean;
  disabled?: boolean;
}

export function CircularTimePicker({
  value,
  onChange,
  label,
  className,
  hasConflict = false,
  disabled = false,
}: CircularTimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selecting, setSelecting] = useState<"hour" | "minute">("hour");
  const [tempHour, setTempHour] = useState(12);
  const [tempMinute, setTempMinute] = useState(0);
  const [is24Hour, setIs24Hour] = useState(true);
  const clockRef = useRef<HTMLDivElement>(null);

  // Parse initial value
  useEffect(() => {
    if (value) {
      const [hours, minutes] = value.split(":").map(Number);
      setTempHour(hours);
      setTempMinute(minutes);
    }
  }, [value]);

  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        handleCancel();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [isOpen]);

  const formatTime = (time: string) => {
    if (!time) return "Select time";
    const [hours, minutes] = time.split(":").map(Number);
    const period = hours >= 12 ? "PM" : "AM";
    const displayHour = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return `${displayHour}:${minutes.toString().padStart(2, "0")} ${period}`;
  };

  const calculateAngle = (
    centerX: number,
    centerY: number,
    x: number,
    y: number
  ) => {
    const deltaX = x - centerX;
    const deltaY = y - centerY;
    let angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);
    angle = (angle + 90 + 360) % 360; // Adjust so 12 o'clock is 0 degrees
    return angle;
  };

  const handleClockClick = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    if (!clockRef.current) return;

    const rect = clockRef.current.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const angle = calculateAngle(centerX, centerY, x, y);

    if (selecting === "hour") {
      const hour = Math.round(angle / 30) % 12 || 12;
      const adjustedHour = is24Hour && tempHour >= 12 ? hour + 12 : hour;
      setTempHour(adjustedHour === 24 ? 0 : adjustedHour);
      setSelecting("minute");
    } else {
      const minute = Math.round(angle / 6) * 1;
      setTempMinute(minute === 60 ? 0 : minute);
    }
  };

  const handleSave = () => {
    const formattedTime = `${tempHour.toString().padStart(2, "0")}:${tempMinute.toString().padStart(2, "0")}`;
    onChange(formattedTime);
    setIsOpen(false);
  };

  const handleCancel = () => {
    if (value) {
      const [hours, minutes] = value.split(":").map(Number);
      setTempHour(hours);
      setTempMinute(minutes);
    }
    setIsOpen(false);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleCancel();
    }
  };

  const togglePeriod = () => {
    if (tempHour >= 12) {
      setTempHour(tempHour - 12);
    } else {
      setTempHour(tempHour + 12);
    }
  };

  const renderClockFace = () => {
    const numbers =
      selecting === "hour"
        ? Array.from({ length: 12 }, (_, i) => i + 1)
        : Array.from({ length: 12 }, (_, i) => i * 5);

    const selectedValue =
      selecting === "hour"
        ? tempHour === 0
          ? 12
          : tempHour > 12
            ? tempHour - 12
            : tempHour
        : tempMinute;

    const selectedAngle =
      selecting === "hour"
        ? ((tempHour === 0 ? 12 : tempHour > 12 ? tempHour - 12 : tempHour) -
            1) *
          30
        : (tempMinute / 5) * 30;

    return (
      <div className="relative w-64 h-64 mx-auto">
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 200 200">
          {/* Clock face */}
          <circle
            cx="100"
            cy="100"
            r="90"
            fill="white"
            stroke="#e5e7eb"
            strokeWidth="2"
          />

          {/* Hour markers */}
          {Array.from({ length: 12 }).map((_, i) => {
            const angle = (i * 30 - 90) * (Math.PI / 180);
            const x1 = 100 + 85 * Math.cos(angle);
            const y1 = 100 + 85 * Math.sin(angle);
            const x2 = 100 + 75 * Math.cos(angle);
            const y2 = 100 + 75 * Math.sin(angle);

            return (
              <line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="#9ca3af"
                strokeWidth="2"
              />
            );
          })}

          {/* Selected time hand */}
          <line
            x1="100"
            y1="100"
            x2={100 + 60 * Math.cos((selectedAngle - 90) * (Math.PI / 180))}
            y2={100 + 60 * Math.sin((selectedAngle - 90) * (Math.PI / 180))}
            stroke={selecting === "hour" ? "#3b82f6" : "#10b981"}
            strokeWidth="3"
            strokeLinecap="round"
          />

          {/* Center dot */}
          <circle
            cx="100"
            cy="100"
            r="4"
            fill={selecting === "hour" ? "#3b82f6" : "#10b981"}
          />
        </svg>

        {/* Numbers */}
        <div
          ref={clockRef}
          className="absolute inset-0 cursor-pointer"
          onClick={handleClockClick}
        >
          {numbers.map((num, i) => {
            const angle = (i * 30 - 90) * (Math.PI / 180);
            const x = 50 + 35 * Math.cos(angle);
            const y = 50 + 35 * Math.sin(angle);
            const isSelected = num === selectedValue;

            return (
              <div
                key={num}
                className={cn(
                  "absolute w-8 h-8 flex items-center justify-center rounded-full text-sm font-medium transform -translate-x-1/2 -translate-y-1/2 transition-colors",
                  isSelected
                    ? selecting === "hour"
                      ? "bg-blue-500 text-white"
                      : "bg-green-500 text-white"
                    : "text-gray-700 hover:bg-gray-100"
                )}
                style={{
                  left: `${x}%`,
                  top: `${y}%`,
                }}
              >
                {num}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className={cn("relative", className)}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {hasConflict && (
            <span className="text-red-500 ml-2">Conflict detected</span>
          )}
        </label>
      )}

      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!disabled) {
            setIsOpen(true);
          }
        }}
        disabled={disabled}
        className={cn(
          "w-full px-3 py-2 text-left border border-gray-300 rounded-md shadow-sm bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors",
          hasConflict && "border-red-500 border-2",
          "flex items-center gap-2"
        )}
      >
        <Clock className="h-4 w-4 text-gray-500" />
        <span className={cn(value ? "text-gray-900" : "text-gray-500")}>
          {formatTime(value)}
        </span>
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
          onClick={handleBackdropClick}
        >
          <div
            className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Select Time
              </h3>

              {/* Time display */}
              <div className="text-center mb-4">
                <div className="text-2xl font-mono">
                  {tempHour.toString().padStart(2, "0")}:
                  {tempMinute.toString().padStart(2, "0")}
                </div>
                <div className="text-sm text-gray-500">
                  {formatTime(`${tempHour}:${tempMinute}`)}
                </div>
              </div>

              {/* Selection toggle */}
              <div className="flex justify-center mb-4">
                <div className="flex bg-gray-100 rounded-lg p-1">
                  <button
                    type="button"
                    onClick={() => setSelecting("hour")}
                    className={cn(
                      "px-4 py-2 text-sm font-medium rounded-md transition-colors",
                      selecting === "hour"
                        ? "bg-blue-500 text-white"
                        : "text-gray-700 hover:bg-gray-200"
                    )}
                  >
                    Hour
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelecting("minute")}
                    className={cn(
                      "px-4 py-2 text-sm font-medium rounded-md transition-colors",
                      selecting === "minute"
                        ? "bg-green-500 text-white"
                        : "text-gray-700 hover:bg-gray-200"
                    )}
                  >
                    Minute
                  </button>
                </div>
              </div>

              {/* Period toggle for 12-hour format */}
              <div className="flex justify-center mb-4">
                <button
                  type="button"
                  onClick={togglePeriod}
                  className="px-4 py-2 text-sm font-medium bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                >
                  {tempHour >= 12 ? "PM" : "AM"}
                </button>
              </div>
            </div>

            {/* Clock face */}
            {renderClockFace()}

            {/* Actions */}
            <div className="flex justify-end gap-2 mt-6">
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-md transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
