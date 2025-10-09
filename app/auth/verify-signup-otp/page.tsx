"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { CheckCircle2, Mail, RefreshCw, X } from "lucide-react";
import Image from "next/image";
import Logo from "../../../public/logo.png";
import { toast } from "@/hooks/use-toast";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://noreen-events.online/noreen-events";

const VerifySignupOTP = () => {
  const [otpValues, setOtpValues] = useState(["", "", "", "", "", ""]);

  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes in seconds
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState(false);

  const router = useRouter();
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Check for pending signup data and start timer
  useEffect(() => {
    const checkPendingSignup = () => {
      const user_id = getCookie("pending_signup_user_id");
      const email = getCookie("pending_signup_email");

      if (!user_id || !email) {
        toast({
          title: "No pending signup",
          description: "Please register first.",
          variant: "destructive",
        });
        setTimeout(() => {
          router.push("/auth/signup");
        }, 3000);
        return;
      }

      setUserEmail(email);
    };

    checkPendingSignup();
  }, [router]);

  // Industry standard session protection - prevent leaving the page
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue =
        "Are you sure you want to leave? Your verification session will be lost.";
      return "Are you sure you want to leave? Your verification session will be lost.";
    };

    const handlePopState = (e: PopStateEvent) => {
      // Prevent back navigation
      e.preventDefault();
      window.history.pushState(null, "", window.location.href);

      toast({
        title: "Cannot go back",
        description: "Please complete the verification process or start over.",
        variant: "destructive",
      });
    };

    // Add event listeners
    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("popstate", handlePopState);

    // Push current state to prevent back navigation
    window.history.pushState(null, "", window.location.href);

    // Cleanup
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  // Timer countdown effect
  useEffect(() => {
    if (timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  // Focus first input on mount
  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return; // Only allow digits

    const newOtpValues = [...otpValues];
    newOtpValues[index] = value.slice(-1); // Take only the last character
    setOtpValues(newOtpValues);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Backspace" && !otpValues[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasteData = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6);
    const newOtpValues = [...otpValues];

    for (let i = 0; i < 6; i++) {
      newOtpValues[i] = pasteData[i] || "";
    }

    setOtpValues(newOtpValues);

    // Focus the next empty input or last input
    const nextEmptyIndex = newOtpValues.findIndex((val) => !val);
    const focusIndex = nextEmptyIndex !== -1 ? nextEmptyIndex : 5;
    inputRefs.current[focusIndex]?.focus();
  };

  const handleVerify = async () => {
    const otpCode = otpValues.join("");

    if (otpCode.length !== 6) {
      toast({
        title: "Incomplete OTP",
        description: "Please enter the complete 6-digit OTP code.",
        variant: "destructive",
      });
      return;
    }

    const user_id = getCookie("pending_signup_user_id");
    const email = getCookie("pending_signup_email");

    if (!user_id || !email) {
      toast({
        title: "Session expired",
        description: "Please register again.",
        variant: "destructive",
      });
      setTimeout(() => {
        router.push("/auth/signup");
      }, 2000);
      return;
    }

    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append("operation", "verify_signup_otp");
      formData.append("user_id", user_id);
      formData.append("email", email);
      formData.append("otp", otpCode);

      const response = await axios.post(`${API_URL}/auth.php`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (response.data.status === "success") {
        setIsVerified(true);
        toast({
          title: "Email verified",
          description: "Welcome to our platform.",
        });

        // Clear the pending signup cookies
        document.cookie =
          "pending_signup_user_id=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        document.cookie =
          "pending_signup_email=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";

        // Clear saved form data since verification was successful
        clearSavedData();

        // Redirect to login after successful verification
        setTimeout(() => {
          router.push("/auth/login");
        }, 2000);
      } else {
        toast({
          title: "Invalid OTP",
          description:
            response.data.message || "Please check the code and try again.",
          variant: "destructive",
        });

        // Clear current OTP inputs for retry
        setOtpValues(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
      }
    } catch (error) {
      console.error("OTP verification error:", error);
      toast({
        title: "Verification error",
        description: "Error verifying OTP. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    const user_id = getCookie("pending_signup_user_id");
    const email = getCookie("pending_signup_email");

    if (!user_id || !email) {
      toast({
        title: "Session expired",
        description: "Please register again.",
        variant: "destructive",
      });
      setTimeout(() => {
        router.push("/auth/signup");
      }, 2000);
      return;
    }

    setIsResending(true);

    try {
      const formData = new FormData();
      formData.append("operation", "resend_signup_otp");
      formData.append("user_id", user_id);
      formData.append("email", email);

      const response = await axios.post(`${API_URL}/auth.php`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (response.data.status === "success") {
        toast({
          title: "OTP sent",
          description: "New OTP sent to your email.",
        });
        setTimeLeft(300); // Reset timer
        setOtpValues(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
      } else {
        toast({
          title: "Resend failed",
          description:
            response.data.message || "Failed to resend OTP. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Resend OTP error:", error);
      toast({
        title: "Resend error",
        description: "Error resending OTP. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsResending(false);
    }
  };

  const getCookie = (name: string) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(";").shift();
    return null;
  };

  // Function to clear saved form data
  const clearSavedData = () => {
    try {
      localStorage.removeItem("signup_form_data");
      console.log("Cleared saved signup data after successful verification");
    } catch (error) {
      console.error("Error clearing saved signup data:", error);
    }
  };

  const isOtpComplete = otpValues.every((val) => val !== "");

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Back to Signup Link */}
        <div className="mb-4">
          <button
            onClick={() => {
              // Clear session cookies before redirecting
              document.cookie =
                "pending_signup_user_id=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
              document.cookie =
                "pending_signup_email=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
              router.replace("/auth/signup");
            }}
            className="text-sm text-gray-600 hover:text-gray-800 flex items-center"
          >
            <X className="h-4 w-4 mr-1" />
            Go Back to Edit Details
          </button>
        </div>

        {/* Logo and Header */}
        <div className="text-center mb-8">
          <Image
            src={Logo}
            alt="Logo"
            width={120}
            height={120}
            className="mx-auto mb-4"
            priority
          />
          <h1 className="text-3xl font-bold text-gray-900">
            Verify Your Email
          </h1>
          <p className="text-gray-600 mt-2">
            We've sent a 6-digit verification code to
          </p>
          <p className="text-[#028A75] font-medium">{userEmail}</p>
        </div>

        {/* OTP Input Form */}
        <div className="bg-white rounded-lg shadow-xl p-8">
          {!isVerified ? (
            <>
              {/* Timer */}
              <div className="text-center mb-6">
                <div className="text-2xl font-bold text-gray-900 mb-2">
                  {formatTime(timeLeft)}
                </div>
                <p className="text-sm text-gray-500">
                  Code expires in {formatTime(timeLeft)}
                </p>
              </div>

              {/* OTP Input Grid */}
              <div className="flex justify-center space-x-3 mb-6">
                {otpValues.map((value, index) => (
                  <input
                    key={index}
                    ref={(el) => {
                      inputRefs.current[index] = el;
                    }}
                    type="text"
                    maxLength={1}
                    value={value}
                    onChange={(e) => handleChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    onPaste={handlePaste}
                    className="w-12 h-12 text-center text-xl font-bold border-2 border-gray-300 rounded-lg focus:border-[#028A75] focus:outline-none focus:ring-2 focus:ring-[#028A75] focus:ring-opacity-20"
                    disabled={isLoading || isVerified}
                  />
                ))}
              </div>

              {/* Verify Button */}
              <button
                onClick={handleVerify}
                disabled={!isOtpComplete || isLoading || timeLeft === 0}
                className="w-full bg-[#028A75] text-white py-3 rounded-lg font-medium hover:bg-[#026B5C] disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors mb-4"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Verifying...
                  </div>
                ) : (
                  "Verify Email"
                )}
              </button>

              {/* Resend OTP */}
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-2">
                  Didn't receive the code?
                </p>
                <button
                  onClick={handleResendOTP}
                  disabled={isResending || timeLeft > 240} // Allow resend after 1 minute
                  className="text-[#028A75] hover:underline font-medium disabled:text-gray-400 disabled:cursor-not-allowed flex items-center justify-center mx-auto"
                >
                  {isResending ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="h-4 w-4 mr-1" />
                      Resend Code
                    </>
                  )}
                </button>
                {timeLeft > 240 && (
                  <p className="text-xs text-gray-500 mt-1">
                    Wait {formatTime(timeLeft - 240)} before requesting a new
                    code
                  </p>
                )}
              </div>
            </>
          ) : (
            /* Success State */
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Email Verified!
              </h2>
              <p className="text-gray-600 mb-4">
                Your email has been successfully verified. You can now login to
                your account.
              </p>
              <div className="flex items-center justify-center text-sm text-gray-500">
                <div className="w-4 h-4 border-2 border-[#028A75] border-t-transparent rounded-full animate-spin mr-2" />
                Redirecting to login page...
              </div>
            </div>
          )}
        </div>

        {/* Help Text */}
        <div className="text-center mt-6">
          <p className="text-sm text-gray-600">
            Need help?{" "}
            <button
              onClick={() => {
                // Clear session cookies before redirecting
                document.cookie =
                  "pending_signup_user_id=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
                document.cookie =
                  "pending_signup_email=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
                router.replace("/auth/signup");
              }}
              className="text-[#028A75] hover:underline font-medium"
            >
              Go back to edit details
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default VerifySignupOTP;
