"use client";
import type React from "react";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import axios from "axios";
import Image from "next/image";
import { toast } from "@/hooks/use-toast";
import { redirectIfAuthenticated } from "@/app/utils/routeProtection";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import type ReCAPTCHAType from "react-google-recaptcha";

// Dynamic import for ReCAPTCHA to prevent hydration issues
const ReCAPTCHA = dynamic(() => import("react-google-recaptcha"), {
  ssr: false,
  loading: () => <div className="h-10 bg-gray-200 rounded animate-pulse"></div>,
});

// Get API and reCAPTCHA keys from .env
const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost/events-api";
const SITE_KEY =
  process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY ||
  "6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI"; // Test site key

const LoginPage = () => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [isLoading, setIsLoading] = useState(false);
  const [captchaResponse, setCaptchaResponse] = useState("");
  const [isClient, setIsClient] = useState(false);
  const recaptchaRef = useRef<ReCAPTCHAType | null>(null);
  const router = useRouter();

  // Fix hydration issues
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Check if user is already logged in (use secureStorage for consistency)
  useEffect(() => {
    try {
      const userData: any =
        require("@/app/utils/encryption").secureStorage.getItem("user");
      const role = (userData?.user_role || "").toLowerCase();
      if (role === "admin") {
        router.push("/admin/dashboard");
      } else if (role === "organizer" || role === "vendor") {
        router.push("/organizer/dashboard");
      } else if (role === "client") {
        router.push("/client/dashboard");
      }
    } catch (_e) {
      // ignore
    }
  }, [router]);

  useEffect(() => {
    // Redirect to dashboard if already authenticated
    redirectIfAuthenticated();
  }, []);

  // Handle input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Handle visible reCAPTCHA token
  const handleCaptchaChange = (token: string | null) => {
    setCaptchaResponse(token || "");
  };

  const handleCaptchaExpired = () => {
    setCaptchaResponse("");
    toast({
      title: "CAPTCHA expired",
      description: "Please verify the CAPTCHA again.",
    });
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
      if (!captchaResponse) {
        toast({
          title: "Complete CAPTCHA",
          description: "Please complete the CAPTCHA to continue.",
          variant: "destructive",
        });
        return;
      }
      formDataToSend.append("captcha", captchaResponse);

      const response = await axios.post(`${API_URL}/auth.php`, formDataToSend, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      console.log("Login response:", response.data);

      if (response.data.status === "otp_sent") {
        shouldResetRecaptcha = true;
        // Store user_id and email in cookie for OTP verification
        document.cookie = `pending_otp_user_id=${response.data.user_id}; path=/`;
        document.cookie = `pending_otp_email=${response.data.email}; path=/`;

        toast({
          title: "OTP sent",
          description:
            response.data.message || "Check your email for the code.",
        });

        // Immediate redirect to OTP page
        router.push("/auth/verify-otp");
      } else if (response.data.status === "error") {
        toast({
          title: "Login failed",
          description: response.data.message || "Invalid credentials.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Unexpected response",
          description: "Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Login error:", error);
      toast({
        title: "Login error",
        description: "Error logging in. Please try again.",
        variant: "destructive",
      });
    } finally {
      // Only reset CAPTCHA on successful path; keep token on failures
      try {
        // If we navigated away, this is a no-op
        // @ts-expect-error runtime guard
        if (
          typeof shouldResetRecaptcha !== "undefined" &&
          shouldResetRecaptcha
        ) {
          recaptchaRef.current?.reset();
        }
      } catch (e) {
        // no-op
      }
      setIsLoading(false);
    }
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
    <div className="relative flex min-h-screen bg-white">
      {/* Top Left Back Button */}
      <Link
        href="/"
        className="absolute top-6 left-6 z-20 flex items-center space-x-2 bg-transparent hover:bg-transparent group"
        aria-label="Back to Home"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 48 24"
          strokeWidth={2.5}
          stroke="white"
          className="w-10 h-6 mr-2 group-hover:-translate-x-1 transition-transform duration-150"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M36 21L12 12l24-9"
          />
        </svg>
        <span className="font-semibold text-white text-lg tracking-wide">
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
        className="flex-1 flex items-center justify-center p-8 bg-gray-50"
        initial={{ x: 100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        <motion.div
          className="w-full max-w-md"
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          {/* Mobile Logo */}
          <div className="lg:hidden flex justify-center mb-8">
            <Image
              src="/logo.png"
              alt="Noreen Logo"
              width={80}
              height={80}
              className="w-20 h-20 object-contain filter invert brightness-0"
              priority
            />
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Welcome Back
              </h1>
              <p className="text-gray-600">
                Sign in to your account to continue
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#334746] focus:border-transparent transition-all duration-200"
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
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#334746] focus:border-transparent transition-all duration-200"
                  placeholder="Enter your password"
                />
              </div>

              {/* Visible reCAPTCHA with token reuse until expiration */}
              <div className="flex justify-center">
                <ReCAPTCHA
                  ref={recaptchaRef}
                  sitekey={SITE_KEY}
                  onChange={handleCaptchaChange}
                  onExpired={handleCaptchaExpired}
                />
              </div>

              <div className="flex items-center justify-between text-sm">
                <Link
                  href="/auth/signup"
                  className="text-[#334746] hover:underline"
                >
                  Don't have an account?
                </Link>
                <Link
                  href="/auth/forgot-password"
                  className="text-[#334746] hover:underline"
                >
                  Forgot password?
                </Link>
              </div>

              <motion.button
                type="submit"
                className="w-full bg-[#334746] text-white py-3 rounded-lg font-medium hover:bg-[#2a3a3a] focus:ring-2 focus:ring-[#334746] focus:ring-offset-2 transition-all duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed"
                disabled={isLoading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Signing in...
                  </div>
                ) : (
                  "Sign In"
                )}
              </motion.button>

              {/* Separator */}
              <div className="flex items-center my-6">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="mx-4 text-gray-400 font-medium text-sm select-none">
                  or login
                </span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              {/* Google Login Button (OAuth placeholder) */}
              <button
                type="button"
                className="w-full flex items-center justify-center gap-3 border border-gray-300 rounded-lg py-3 bg-white hover:bg-gray-50 transition-colors font-medium text-gray-700 shadow-sm"
                onClick={() => {
                  /* TODO: Add Google OAuth logic here */
                }}
                disabled={isLoading}
              >
                <svg
                  className="w-5 h-5"
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
  );
};

export default LoginPage;
