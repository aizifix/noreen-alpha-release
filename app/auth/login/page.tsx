"use client";
import type React from "react";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "@/hooks/use-toast";
import ClientRouteProtection from "@/app/components/client-route-protection";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import type ReCAPTCHAType from "react-google-recaptcha";
import { Eye, EyeOff, RefreshCw } from "lucide-react";

// Dynamic import for ReCAPTCHA to prevent hydration issues (temporarily disabled)
// const ReCAPTCHA = dynamic(() => import("react-google-recaptcha"), {
//   ssr: false,
//   loading: () => <div className="h-10 bg-gray-200 rounded animate-pulse"></div>,
// });

// Get API and reCAPTCHA keys from .env
import { api } from "@/app/config/api";
// const SITE_KEY =
//   process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY ||
//   "6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI"; // Test site key

const LoginPage = () => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  // Math challenge state instead of captcha
  const [mathChallenge, setMathChallenge] = useState({ num1: 0, num2: 0 });
  const [mathAnswer, setMathAnswer] = useState("");
  const [mathValidation, setMathValidation] = useState<
    "none" | "correct" | "incorrect"
  >("none");
  const [isClient, setIsClient] = useState(false);
  // const recaptchaRef = useRef<ReCAPTCHAType | null>(null);
  // let shouldResetRecaptcha = false;
  const router = useRouter();

  // Fix hydration issues and generate math problem
  useEffect(() => {
    setIsClient(true);
    // Generate simple math challenge on load
    generateMathChallenge();
  }, []);

  // Generate a simple math challenge
  const generateMathChallenge = () => {
    // Generate two random numbers between 1-9 for a simple addition problem
    const num1 = Math.floor(Math.random() * 9) + 1;
    const num2 = Math.floor(Math.random() * 9) + 1;
    setMathChallenge({ num1, num2 });
    setMathAnswer("");
    setMathValidation("none");
  };

  // We now handle authentication redirection with ClientRouteProtection component

  // Handle input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Handle math challenge answer with real-time validation
  const handleMathAnswerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setMathAnswer(value);

    // Real-time validation
    if (value === "") {
      setMathValidation("none");
    } else {
      const correctAnswer = mathChallenge.num1 + mathChallenge.num2;
      const userAnswer = parseInt(value);

      if (!isNaN(userAnswer)) {
        if (userAnswer === correctAnswer) {
          setMathValidation("correct");
        } else {
          setMathValidation("incorrect");
        }
      } else {
        setMathValidation("none");
      }
    }
  };

  // Handle form submission (single step with captcha)
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setIsLoading(true);

    try {
      let shouldResetRecaptcha = false;

      const formDataToSend = new FormData();
      formDataToSend.append("operation", "login");
      formDataToSend.append("email", formData.email.trim());
      formDataToSend.append("password", formData.password);
      // Validate math challenge
      const correctAnswer = mathChallenge.num1 + mathChallenge.num2;
      if (!mathAnswer || parseInt(mathAnswer) !== correctAnswer) {
        toast({
          title: "Incorrect Answer",
          description: "Please solve the math challenge correctly to continue.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }
      formDataToSend.append("captcha", "math_challenge_passed"); // Send placeholder value

      const response = await api.auth.login(formDataToSend);

      console.log("Login response:", response.data);

      if (response.data.status === "otp_sent") {
        // Reset math challenge if needed
        generateMathChallenge();
        // Store user_id and email in cookie for OTP verification
        document.cookie = `pending_otp_user_id=${response.data.user_id}; path=/`;
        document.cookie = `pending_otp_email=${response.data.email}; path=/`;

        toast({
          title: "OTP sent",
          description:
            response.data.message || "Check your email for the code.",
        });

        // Keep loading state active during navigation to OTP page
        router.push("/auth/verify-otp");
        // Don't reset loading state here - let it continue until navigation completes
      } else if (response.data.status === "success" && response.data.user) {
        // Direct login success (OTP may be disabled globally). Check per-user OTP preference for organizer/vendor.
        try {
          const userData = response.data.user;
          const role = (userData.user_role || "").toLowerCase();

          // If organizer/vendor has personal OTP preference enabled, request OTP and route to verification
          let personalOtpOn = false;
          try {
            const key = `organizer_otp_preference_${userData.user_id}`;
            const raw =
              typeof window !== "undefined" ? localStorage.getItem(key) : null;
            personalOtpOn = raw === "1" || raw === "true" || raw === "TRUE";
          } catch {}

          if ((role === "organizer" || role === "vendor") && personalOtpOn) {
            // Explicitly request OTP
            const fd = new FormData();
            fd.append("operation", "request_otp");
            fd.append("user_id", String(userData.user_id));
            fd.append("email", userData.user_email || "");

            const otpResp = await api.auth.requestOtp(fd);

            if (otpResp.data?.status === "otp_sent") {
              document.cookie = `pending_otp_user_id=${userData.user_id}; path=/`;
              document.cookie = `pending_otp_email=${userData.user_email}; path=/`;
              toast({
                title: "OTP sent",
                description: "Check your email for the code.",
              });
              // Do NOT store user yet; require OTP verification
              // Keep loading state active during navigation to OTP page
              router.push("/auth/verify-otp");
              return;
            }
            // If OTP request failed, fall back to normal login
          }

          // Store user securely and redirect based on role
          const { secureStorage } = await import("@/app/utils/encryption");
          secureStorage.setItem("user", userData);

          // Keep loading state active during navigation
          if (role === "admin") router.replace("/admin/dashboard");
          else if (role === "staff") router.replace("/staff/dashboard");
          else if (role === "organizer") router.replace("/organizer/dashboard");
          else router.replace("/client/dashboard");
        } catch (e) {
          console.error("Post-login handling error:", e);
          toast({
            title: "Login error",
            description: "Please try again.",
            variant: "destructive",
          });
          setIsLoading(false);
        }
      } else if (response.data.status === "error") {
        toast({
          title: "Login failed",
          description: response.data.message || "Invalid credentials.",
          variant: "destructive",
        });
        generateMathChallenge();
        setIsLoading(false);
      } else {
        toast({
          title: "Unexpected response",
          description: "Please try again.",
          variant: "destructive",
        });
        generateMathChallenge();
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Login error:", error);
      toast({
        title: "Login error",
        description: "Error logging in. Please try again.",
        variant: "destructive",
      });
      generateMathChallenge();
      setIsLoading(false);
    }

    // Only regenerate math challenge for error cases, not for successful navigation
    // The loading state will remain active during successful navigation
  };

  // Don't render until client-side
  if (!isClient) {
    return (
      <div className="flex min-h-screen bg-white">
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#334746]"></div>
        </div>
      </div>
    );
  }

  return (
    <ClientRouteProtection authRequired={false}>
      <div className="relative flex min-h-screen bg-white overflow-hidden">
        {/* Top Left Back Button */}
        <Link
          href="/"
          className="absolute top-4 left-4 sm:top-6 sm:left-6 z-20 flex items-center space-x-1 sm:space-x-2 bg-transparent hover:bg-transparent group"
          aria-label="Back to Home"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 48 24"
            strokeWidth={2.5}
            stroke="white"
            className="w-8 h-5 sm:w-10 sm:h-6 mr-1 sm:mr-2 group-hover:-translate-x-1 transition-transform duration-150"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M36 21L12 12l24-9"
            />
          </svg>
          <span className="font-semibold text-white text-base sm:text-lg tracking-wide">
            Back
          </span>
        </Link>

        {/* Left Frame - Video and Branding */}
        <motion.div
          className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-[#334746] to-[#1a2a2a]"
          initial={{ x: -100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          {/* Video Background */}
          <div className="absolute inset-0">
            <video
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-cover opacity-40"
              crossOrigin="anonymous"
            >
              <source src="/noreen.mp4" type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>

          {/* Content Overlay - Centered */}
          <div className="relative z-10 flex flex-col justify-between items-center h-full w-full px-12 py-8">
            {/* Centered Logo and Quote */}
            <div className="flex-1 flex flex-col justify-center items-center">
              <motion.div
                className="flex flex-col items-center justify-center"
                initial={{ y: -50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.2 }}
              >
                <Image
                  src="/logo.png"
                  alt="Noreen Logo"
                  width={120}
                  height={120}
                  className="w-28 h-28 object-contain mb-4 filter invert brightness-0"
                  priority
                />
                <motion.div
                  className="text-center"
                  initial={{ y: 50, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.8, delay: 0.4 }}
                >
                  <blockquote className="text-2xl font-light italic mb-4 text-white drop-shadow-lg">
                    "Creating unforgettable moments, one event at a time."
                  </blockquote>
                  <p className="text-lg text-gray-200">
                    Your trusted partner in event coordination
                  </p>
                </motion.div>
              </motion.div>
            </div>

            {/* Bottom Section - Social Platforms and Copyright Centered */}
            <motion.div
              className="space-y-6 w-full flex flex-col items-center mb-2"
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.6 }}
            >
              {/* Social Platforms */}
              <div className="flex justify-center space-x-6">
                <a
                  href="#"
                  className="text-white hover:text-gray-300 transition-colors"
                >
                  <svg
                    className="w-6 h-6"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z" />
                  </svg>
                </a>
                <a
                  href="#"
                  className="text-white hover:text-gray-300 transition-colors"
                >
                  <svg
                    className="w-6 h-6"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M22.46 6c-.77.35-1.6.58-2.46.69.88-.53 1.56-1.37 1.88-2.38-.83.5-1.75.85-2.72 1.05C18.37 4.5 17.26 4 16 4c-2.35 0-4.27 1.92-4.27 4.29 0 .34.04.67.11.98C8.28 9.09 5.11 7.38 3 4.79c-.37.63-.58 1.37-.58 2.15 0 1.49.75 2.81 1.91 3.56-.71 0-1.37-.2-1.95-.5v.03c0 2.08 1.48 3.82 3.44 4.21a4.22 4.22 0 0 1-1.93.07 4.28 4.28 0 0 0 4 2.98 8.521 8.521 0 0 1-5.33 1.84c-.34 0-.68-.02-1.02-.06C3.44 20.29 5.7 21 8.12 21 16 21 20.33 14.46 20.33 8.79c0-.19 0-.37-.01-.56.84-.6 1.56-1.36 2.14-2.23z" />
                  </svg>
                </a>
                <a
                  href="#"
                  className="text-white hover:text-gray-300 transition-colors"
                >
                  <svg
                    className="w-6 h-6"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.174-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.402.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.357-.629-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24.009 12.017 24.009c6.624 0 11.99-5.367 11.99-11.988C24.007 5.367 18.641.001 12.017.001z" />
                  </svg>
                </a>
                <a
                  href="#"
                  className="text-white hover:text-gray-300 transition-colors"
                >
                  <svg
                    className="w-6 h-6"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  </svg>
                </a>
              </div>
              {/* Copyright */}
              <div className="text-center text-sm text-gray-200">
                © {isClient ? new Date().getFullYear() : "2024"} Noreen. All
                rights reserved.
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* Right Frame - Login Form */}
        <motion.div
          className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen"
          initial={{ x: 100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <motion.div
            className="w-full max-w-md mx-auto relative"
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            {/* Mobile Logo */}
            <div className="lg:hidden flex justify-center mb-6 sm:mb-8">
              <Image
                src="/logo.png"
                alt="Noreen Logo"
                width={80}
                height={80}
                className="w-16 h-16 sm:w-20 sm:h-20 object-contain filter invert brightness-0"
                priority
              />
            </div>

            <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
              <div className="text-center mb-6 sm:mb-8">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                  Welcome Back
                </h1>
                <p className="text-sm sm:text-base text-gray-600">
                  Sign in to your account to continue
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    disabled={isLoading}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#334746] focus:border-transparent transition-all duration-200 text-sm sm:text-base disabled:bg-gray-100 disabled:cursor-not-allowed"
                    placeholder="Enter your email"
                  />
                </div>

                <div>
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      id="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      disabled={isLoading}
                      className="w-full px-3 sm:px-4 py-2.5 sm:py-3 pr-10 sm:pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#334746] focus:border-transparent transition-all duration-200 text-sm sm:text-base disabled:bg-gray-100 disabled:cursor-not-allowed"
                      placeholder="Enter your password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 sm:h-5 sm:w-5" />
                      ) : (
                        <Eye className="h-4 w-4 sm:h-5 sm:w-5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Simple Math Challenge */}
                <div className="flex flex-col items-center p-3 sm:p-4 border rounded-lg bg-gray-50 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full gap-2">
                    <label className="text-xs sm:text-sm font-medium text-gray-700 text-center sm:text-left">
                      Please solve this simple math problem:
                    </label>
                    <button
                      type="button"
                      onClick={generateMathChallenge}
                      disabled={isLoading}
                      className="flex items-center justify-center gap-1 px-2 py-1 text-xs text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors self-center sm:self-auto disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Generate new math problem"
                    >
                      <RefreshCw className="h-3 w-3" />
                      Reset
                    </button>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="p-2 bg-white border rounded-md text-base sm:text-lg font-medium w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center">
                      {mathChallenge.num1}
                    </div>
                    <div className="text-base sm:text-lg font-medium">+</div>
                    <div className="p-2 bg-white border rounded-md text-base sm:text-lg font-medium w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center">
                      {mathChallenge.num2}
                    </div>
                    <div className="text-base sm:text-lg font-medium">=</div>
                    <input
                      type="number"
                      className={`p-2 border rounded-md w-14 sm:w-16 h-10 sm:h-12 text-center text-base sm:text-lg font-medium focus:ring-2 focus:ring-[#334746] focus:border-transparent transition-all duration-200 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none disabled:bg-gray-100 disabled:cursor-not-allowed ${
                        mathValidation === "correct"
                          ? "border-green-500 bg-green-50 ring-2 ring-green-200"
                          : mathValidation === "incorrect"
                            ? "border-red-500 bg-red-50 ring-2 ring-red-200"
                            : "border-gray-300"
                      }`}
                      value={mathAnswer}
                      onChange={handleMathAnswerChange}
                      required
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 text-xs sm:text-sm">
                  <Link
                    href="/auth/signup"
                    className="text-[#334746] hover:underline text-center sm:text-left"
                  >
                    Don't have an account?
                  </Link>
                  <Link
                    href="/auth/forgot-password"
                    className="text-[#334746] hover:underline text-center sm:text-right"
                  >
                    Forgot password?
                  </Link>
                </div>

                <motion.button
                  type="submit"
                  className="w-full bg-[#334746] text-white py-2.5 sm:py-3 rounded-lg font-medium hover:bg-[#2a3a3a] focus:ring-2 focus:ring-[#334746] focus:ring-offset-2 transition-all duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm sm:text-base"
                  disabled={isLoading}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center gap-2">
                      <span>Signing in</span>
                      <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-2 border-white border-t-transparent" />
                    </div>
                  ) : (
                    "Sign In"
                  )}
                </motion.button>

                {/* Separator */}
                <div className="flex items-center my-4 sm:my-6">
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="mx-3 sm:mx-4 text-gray-400 font-medium text-xs sm:text-sm select-none">
                    or login
                  </span>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>

                {/* Google Login Button (OAuth placeholder) */}
                <button
                  type="button"
                  className="w-full flex items-center justify-center gap-2 sm:gap-3 border border-gray-300 rounded-lg py-2.5 sm:py-3 bg-white hover:bg-gray-50 transition-colors font-medium text-gray-700 shadow-sm text-sm sm:text-base disabled:bg-gray-100 disabled:cursor-not-allowed"
                  onClick={() => {
                    /* TODO: Add Google OAuth logic here */
                  }}
                  disabled={isLoading}
                >
                  <svg
                    className="w-4 h-4 sm:w-5 sm:h-5"
                    viewBox="0 0 48 48"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <g clipPath="url(#clip0_17_40)">
                      <path
                        d="M47.5 24.5C47.5 22.6 47.3 20.8 47 19H24V29.1H37.4C36.7 32.1 34.7 34.6 31.9 36.2V42H39.5C44 38.1 47.5 32.1 47.5 24.5Z"
                        fill="#4285F4"
                      />
                      <path
                        d="M24 48C30.6 48 36.1 45.9 39.5 42L31.9 36.2C30.1 37.3 27.9 38 24 38C18.7 38 14.1 34.4 12.5 29.9H4.7V35.9C8.1 42.1 15.4 48 24 48Z"
                        fill="#34A853"
                      />
                      <path
                        d="M12.5 29.9C12.1 28.8 11.9 27.6 11.9 26.4C11.9 25.2 12.1 24 12.5 22.9V16.1H4.7C3.1 19.1 2 22.4 2 26.4C2 30.4 3.1 33.7 4.7 36.7L12.5 29.9Z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M24 9.9C27.2 9.9 29.4 11.2 30.7 12.4L39.6 4.1C36.1 1 30.6-1 24-1C15.4-1 8.1 4.1 4.7 10.3L12.5 17.1C14.1 12.6 18.7 9.9 24 9.9Z"
                        fill="#EA4335"
                      />
                    </g>
                    <defs>
                      <clipPath id="clip0_17_40">
                        <rect width="48" height="48" fill="white" />
                      </clipPath>
                    </defs>
                  </svg>
                  <span>Continue with Google</span>
                </button>
              </form>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </ClientRouteProtection>
  );
};

export default LoginPage;
