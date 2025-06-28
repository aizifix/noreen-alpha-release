"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { CheckCircle2, XCircle } from "lucide-react";
import Image from "next/image";
import Logo from "../../../public/logo.png";
import { secureStorage } from "@/app/utils/encryption";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost/events-api";

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
      setMessage("Session expired. Please login again.");
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
          setMessage("Verification successful! Redirecting...");
          setShowAlert(true);

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
          setMessage("Error processing user data. Please try again.");
          setOtpValues(Array(6).fill(""));
          if (firstInputRef.current) {
            firstInputRef.current.focus();
          }
        }
      } else {
        setMessage(response.data.message || "Invalid OTP");
        setOtpValues(Array(6).fill(""));
        if (firstInputRef.current) {
          firstInputRef.current.focus();
        }
      }
    } catch (error) {
      console.error("Error during OTP verification:", error);
      setMessage("An error occurred during verification");
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
        setMessage("New OTP has been sent to your email.");
        setOtpValues(Array(6).fill(""));
        setIsValid(false);
        // Focus on first input
        inputRefs.current[0]?.focus();
      } else {
        setMessage(
          response.data.message || "Failed to resend OTP. Please try again."
        );
      }
    } catch (error) {
      console.error("Error resending OTP:", error);
      setMessage("Error resending OTP. Please try again.");
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
    <div className="flex flex-col min-h-screen items-center justify-center bg-gray-100">
      <Image
        src={Logo}
        alt="Logo"
        className="mb-6"
        width={150}
        height={150}
        priority
      />
      <div className="w-full max-w-sm p-6 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-semibold text-gray-800 mb-6">Enter OTP</h2>
        <p className="text-sm text-gray-600 mb-4">
          Please enter the OTP sent to {userEmail ? userEmail : "your email"}
        </p>

        <div className="flex gap-2 mb-6">
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
              className={`w-12 h-12 text-center text-xl font-semibold border-2 rounded-lg
                ${isValid ? "border-green-500" : digit ? "border-red-500" : "border-gray-300"}
                focus:outline-none focus:border-blue-500`}
              maxLength={1}
              disabled={isLoading}
            />
          ))}
        </div>

        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-gray-500">
            Time remaining: {formatTime(timeLeft)}
          </span>
          {isValid && <CheckCircle2 className="w-5 h-5 text-green-500" />}
          {!isValid && otpValues.some((digit) => digit) && (
            <XCircle className="w-5 h-5 text-red-500" />
          )}
        </div>

        <button
          onClick={handleVerify}
          disabled={isLoading || !isValid}
          className="w-full bg-[#334746] text-white py-2 rounded-lg hover:bg-gray-800 disabled:bg-gray-400 transition-colors"
        >
          {isLoading ? "Verifying..." : "Verify OTP"}
        </button>

        {timeLeft === 0 ? (
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-600">OTP expired.</p>
            <button
              onClick={handleResendOTP}
              className="text-blue-600 hover:underline text-sm"
              disabled={isLoading}
            >
              Resend OTP
            </button>
          </div>
        ) : (
          <p className="mt-4 text-sm text-center text-gray-500">
            Didn't receive the code?{" "}
            <button
              onClick={handleResendOTP}
              className="text-blue-600 hover:underline"
              disabled={isLoading || timeLeft > 240} // Allow resend after 1 minute
            >
              Resend
            </button>
          </p>
        )}

        {message && (
          <p className="mt-4 text-sm text-center text-red-600">{message}</p>
        )}
      </div>
    </div>
  );
};

export default VerifyOTP;
