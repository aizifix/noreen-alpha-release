"use client";
import type React from "react";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import axios from "axios";
import Image from "next/image";
import ReCAPTCHA from "react-google-recaptcha";
import Logo from "../../../public/logo.png";
import { SlidingAlert } from "../../components/ui/sliding-alert";
import { redirectIfAuthenticated } from "@/app/utils/routeProtection";

// Get API and reCAPTCHA keys from .env
const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost/events-api";
const SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || "";

const LoginPage = () => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    captchaResponse: "", // Store CAPTCHA response
  });

  const [message, setMessage] = useState("");
  const [showAlert, setShowAlert] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  // Temporarily commented out login limitation
  // const [loginAttempts, setLoginAttempts] = useState(0);
  // const [isLocked, setIsLocked] = useState(false);
  // const [lockoutEndTime, setLockoutEndTime] = useState<number | null>(null);
  const router = useRouter();

  // Check if user is already logged in
  useEffect(() => {
    const checkAuth = () => {
      const user = localStorage.getItem("user");
      if (user) {
        try {
          const userData = JSON.parse(user);
          const userRole = userData.user_role.toLowerCase();

          if (userRole === "admin") {
            router.push("/admin/dashboard");
          } else if (userRole === "organizer") {
            router.push("/organizer/dashboard");
          } else if (userRole === "client") {
            router.push("/client/dashboard");
          }
        } catch (error) {
          // If JSON parsing fails, clear the invalid data
          localStorage.removeItem("user");
          localStorage.removeItem("user_id");
        }
      }
    };

    checkAuth();
  }, [router]);

  useEffect(() => {
    // Redirect to dashboard if already authenticated
    redirectIfAuthenticated();
  }, []);

  // Temporarily commented out lockout check
  /*
  useEffect(() => {
    const storedAttempts = localStorage.getItem("loginAttempts");
    const storedLockoutEnd = localStorage.getItem("lockoutEndTime");

    if (storedAttempts) {
      const attempts = parseInt(storedAttempts);
      setLoginAttempts(attempts);

      // Only check lockout if there are enough failed attempts
      if (attempts >= 5 && storedLockoutEnd) {
        const lockoutEnd = parseInt(storedLockoutEnd);
        if (lockoutEnd > Date.now()) {
          setIsLocked(true);
          setLockoutEndTime(lockoutEnd);
        } else {
          // Clear expired lockout
          localStorage.removeItem("loginAttempts");
          localStorage.removeItem("lockoutEndTime");
          setLoginAttempts(0);
          setIsLocked(false);
          setLockoutEndTime(null);
        }
      }
    }
  }, []);
  */

  // Handle input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Handle CAPTCHA change
  const handleCaptchaChange = (token: string | null) => {
    setFormData((prev) => ({ ...prev, captchaResponse: token || "" }));
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage("");
    setShowAlert(false);
    setIsLoading(true);

    if (!formData.captchaResponse) {
      setMessage("⚠ Please complete the CAPTCHA.");
      setShowAlert(true);
      setIsLoading(false);
      return;
    }

    try {
      const formDataToSend = new FormData();
      formDataToSend.append("operation", "login");
      formDataToSend.append("email", formData.email.trim());
      formDataToSend.append("password", formData.password);
      formDataToSend.append("captcha", formData.captchaResponse);

      const response = await axios.post(`${API_URL}/auth.php`, formDataToSend, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      console.log("Login response:", response.data); // Debug log

      if (response.data.status === "otp_sent") {
        // Store user_id and email in cookie for OTP verification
        document.cookie = `pending_otp_user_id=${response.data.user_id}; path=/`;
        document.cookie = `pending_otp_email=${response.data.email}; path=/`;

        // Debug log for cookie setting
        console.log("Setting cookies:", {
          user_id: response.data.user_id,
          email: response.data.email,
          cookies: document.cookie,
        });

        // Show success message
        setMessage(response.data.message || "OTP sent successfully!");
        setShowAlert(true);

        // Immediate redirect to OTP page
        router.push("/auth/verify-otp");
      } else if (response.data.status === "error") {
        setMessage(response.data.message || "⚠ Invalid credentials");
        setShowAlert(true);
      } else {
        setMessage("⚠ Unexpected response from server");
        setShowAlert(true);
      }
    } catch (error) {
      console.error("Login error:", error);
      setMessage("⚠ Error logging in. Please try again.");
      setShowAlert(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen items-center justify-center bg-gray-100 relative">
      <Image
        src={Logo || "/placeholder.svg"}
        alt="Logo"
        className="mb-6"
        width={150}
        height={150}
        style={{ width: "auto", height: "auto" }}
        priority
      />
      <div className="w-full max-w-sm p-6 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl flex flex-start font-semibold text-center text-gray-800">
          Login
        </h2>

        <form className="mt-4" onSubmit={handleSubmit}>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="Email"
            required
            className="mt-1 block w-full px-4 py-2 border rounded-lg"
          />
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="Password"
            required
            className="mt-4 block w-full px-4 py-2 border rounded-lg"
          />

          {/* Add reCAPTCHA */}
          <div className="mt-4">
            <ReCAPTCHA sitekey={SITE_KEY} onChange={handleCaptchaChange} />
          </div>

          <div className="mt-2 flex justify-between text-sm">
            <Link href="/auth/signup">
              <span className="text-gray-500 hover:underline cursor-pointer">
                Become an Organizer
              </span>
            </Link>
            <a href="#" className="text-gray-500 hover:underline">
              Forgot password?
            </a>
          </div>

          <button
            type="submit"
            className="mt-4 w-full bg-[#334746] text-white py-2 rounded-lg hover:bg-gray-800 disabled:bg-gray-400"
            disabled={isLoading || !formData.captchaResponse}
          >
            {isLoading ? "Logging in..." : "Login"}
          </button>
        </form>
      </div>

      <SlidingAlert
        message={message}
        show={showAlert}
        onClose={() => setShowAlert(false)}
      />
    </div>
  );
};

export default LoginPage;
