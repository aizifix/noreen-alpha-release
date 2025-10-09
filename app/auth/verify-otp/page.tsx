"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { toast } from "@/hooks/use-toast";
import { CheckCircle2, XCircle } from "lucide-react";
import Image from "next/image";
import Logo from "../../../public/logo.png";
import { secureStorage } from "@/app/utils/encryption";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://noreen-events.online/noreen-events";

const VerifyOTP = () => {
  const [otpValues, setOtpValues] = useState(["", "", "", "", "", ""]);
  const [message, setMessage] = useState("");
  const [showAlert, setShowAlert] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isValid, setIsValid] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes in seconds
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const router = useRouter();
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const firstInputRef = useRef<HTMLInputElement | null>(null);

  // Request OTP on component mount
  useEffect(() => {
    const requestOTP = async () => {
      const user_id = getCookie("pending_otp_user_id");
      const email = getCookie("pending_otp_email");

      if (!user_id || !email) {
        toast({
          title: "Session expired",
          description: "Please log in again.",
          variant: "destructive",
        });
        router.push("/auth/login");
        return;
      }

      setUserEmail(email);
    };

    requestOTP();
  }, [router]);

  // Timer effect
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Format remaining time
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  // Handle input change
  const handleChange = (index: number, value: string) => {
    if (value.length > 1) value = value[0];
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otpValues];
    newOtp[index] = value;
    setOtpValues(newOtp);

    // Move to next input if value is entered
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Check if OTP is complete and valid
    const isComplete = newOtp.every((digit) => digit !== "");
    setIsValid(isComplete);
  };

  // Handle key press
  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Backspace" && !otpValues[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // Handle paste
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").slice(0, 6);
    if (!/^\d+$/.test(pastedData)) return;

    const digits = pastedData.split("");
    const newOtp = [...otpValues];
    digits.forEach((digit, index) => {
      if (index < 6) newOtp[index] = digit;
    });
    setOtpValues(newOtp);
    setIsValid(newOtp.every((digit) => digit !== ""));
  };

  // Handle verify
  const handleVerify = async () => {
    const user_id = getCookie("pending_otp_user_id");
    if (!user_id) {
      toast({
        title: "Session expired",
        description: "Please login again.",
        variant: "destructive",
      });
      router.push("/auth/login");
      return;
    }

    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append("operation", "verify_otp");
      formData.append("user_id", user_id);
      formData.append("otp", otpValues.join(""));

      // Enhanced debug logging
      console.log("Verification details:", {
        user_id,
        otp: otpValues.join(""),
        cookies: document.cookie,
        formData: Object.fromEntries(formData),
      });

      const response = await axios.post(`${API_URL}/auth.php`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      // Enhanced response logging
      console.log("Full verification response:", response);
      console.log("Response data:", response.data);

      if (response.data.status === "success") {
        try {
          // Ensure we have valid user data
          const userData = response.data.user;
          if (!userData || !userData.user_id || !userData.user_role) {
            throw new Error("Invalid user data received");
          }

          // Store user data in encrypted form
          secureStorage.setItem("user", userData);

          // Clear OTP cookies
          document.cookie =
            "pending_otp_user_id=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;";
          document.cookie =
            "pending_otp_email=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;";

          // Show success message
          toast({
            title: "Verification successful",
            description: "Redirecting to your dashboard...",
          });

          // Redirect based on user role
          const userRole = userData.user_role.toLowerCase();
          setTimeout(() => {
            if (userRole === "admin") {
              router.replace("/admin/dashboard");
            } else if (userRole === "organizer") {
              router.replace("/organizer/dashboard");
            } else if (userRole === "client") {
              router.replace("/client/dashboard");
            }
          }, 1000);
        } catch (error) {
          console.error("Error processing user data:", error);
          toast({
            title: "Processing error",
            description: "Please try again.",
            variant: "destructive",
          });
          setOtpValues(Array(6).fill(""));
          if (firstInputRef.current) {
            firstInputRef.current.focus();
          }
        }
      } else {
        toast({
          title: "Invalid OTP",
          description: response.data.message || "Please try again.",
          variant: "destructive",
        });
        setOtpValues(Array(6).fill(""));
        if (firstInputRef.current) {
          firstInputRef.current.focus();
        }
      }
    } catch (error) {
      console.error("Error during OTP verification:", error);
      toast({
        title: "Verification error",
        description: "An error occurred during verification.",
        variant: "destructive",
      });
      setOtpValues(Array(6).fill(""));
      if (firstInputRef.current) {
        firstInputRef.current.focus();
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Handle resend OTP
  const handleResendOTP = async () => {
    const user_id = getCookie("pending_otp_user_id");
    const email = getCookie("pending_otp_email");

    if (!user_id || !email) {
      toast({
        title: "Session expired",
        description: "Please login again.",
        variant: "destructive",
      });
      router.push("/auth/login");
      return;
    }

    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("operation", "request_otp");
      formData.append("user_id", user_id);
      formData.append("email", email);

      console.log("Resending OTP for:", { user_id, email });

      const response = await axios.post(`${API_URL}/auth.php`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      console.log("Resend OTP response:", response.data);

      if (response.data.status === "otp_sent") {
        setTimeLeft(300); // Reset timer
        toast({
          title: "OTP sent",
          description: "New OTP has been sent to your email.",
        });
        setOtpValues(Array(6).fill(""));
        setIsValid(false);
        // Focus on first input
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
      console.error("Error resending OTP:", error);
      toast({
        title: "Resend error",
        description: "Error resending OTP. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to get cookie value
  const getCookie = (name: string) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(";").shift();
    return null;
  };

  // Add useEffect to handle expired OTP
  useEffect(() => {
    if (timeLeft === 0) {
      setMessage("OTP has expired. Please request a new one.");
      setOtpValues(Array(6).fill(""));
      setIsValid(false);
    }
  }, [timeLeft]);

  return (
    <div className="flex flex-col min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-xl border border-gray-100">
        <div className="text-center mb-8">
          <Image
            src={Logo}
            alt="Logo"
            className="mx-auto mb-4"
            width={80}
            height={80}
            priority
          />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Verify Your Identity
          </h2>
          <p className="text-sm text-gray-600">
            Enter the 6-digit code sent to{" "}
            <span className="font-medium text-blue-600">
              {userEmail ? userEmail : "your email"}
            </span>
          </p>
        </div>

        <div className="flex justify-center gap-3 mb-8">
          {otpValues.map((digit, index) => (
            <input
              key={index}
              ref={(el) => {
                inputRefs.current[index] = el;
                if (index === 0) firstInputRef.current = el;
                return undefined;
              }}
              type="text"
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={handlePaste}
              className={`w-14 h-14 text-center text-2xl font-bold border-2 rounded-xl transition-all duration-200
                ${
                  isValid
                    ? "border-green-500 bg-green-50 text-green-700"
                    : digit
                      ? "border-red-500 bg-red-50 text-red-700"
                      : "border-gray-300 bg-gray-50 text-gray-700"
                }
                focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100
                hover:border-gray-400`}
              maxLength={1}
              disabled={isLoading}
            />
          ))}
        </div>

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div
              className={`w-3 h-3 rounded-full ${timeLeft > 60 ? "bg-green-500" : timeLeft > 30 ? "bg-yellow-500" : "bg-red-500"} animate-pulse`}
            ></div>
            <span className="text-sm font-medium text-gray-600">
              {timeLeft > 0 ? formatTime(timeLeft) : "Expired"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {isValid && <CheckCircle2 className="w-6 h-6 text-green-500" />}
            {!isValid && otpValues.some((digit) => digit) && (
              <XCircle className="w-6 h-6 text-red-500" />
            )}
          </div>
        </div>

        <button
          onClick={handleVerify}
          disabled={isLoading || !isValid}
          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-400 transition-all duration-200 transform hover:scale-[1.02] disabled:scale-100 shadow-lg disabled:shadow-none"
        >
          {isLoading ? (
            <div className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Verifying...
            </div>
          ) : (
            "Verify Code"
          )}
        </button>

        {timeLeft === 0 ? (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl text-center">
            <p className="text-sm text-red-700 font-medium mb-3">
              OTP has expired
            </p>
            <button
              onClick={handleResendOTP}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
              disabled={isLoading}
            >
              {isLoading ? "Sending..." : "Send New Code"}
            </button>
          </div>
        ) : (
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600 mb-3">
              Didn't receive the code?
            </p>
            <button
              onClick={handleResendOTP}
              className="text-blue-600 hover:text-blue-700 font-medium text-sm transition-colors"
              disabled={isLoading || timeLeft > 240} // Allow resend after 1 minute
            >
              {isLoading ? "Sending..." : "Resend Code"}
            </button>
          </div>
        )}

        {message && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700 text-center">{message}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default VerifyOTP;
