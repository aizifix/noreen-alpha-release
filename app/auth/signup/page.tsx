"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import axios from "axios";
import Image from "next/image";
import ReCAPTCHA from "react-google-recaptcha";
import {
  CheckIcon,
  XIcon,
  Eye,
  EyeOff,
  Check,
  User,
  Mail,
  Shield,
  Calendar,
  Phone,
  ArrowLeft,
  ArrowRight,
  UserCheck,
  ChevronDown,
} from "lucide-react";
import Logo from "../../../public/logo.png";
import { SlidingAlert } from "../../components/ui/sliding-alert";
import { cn } from "@/lib/utils";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost/events-api";
const SITE_KEY =
  process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY ||
  "6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI"; // Test site key that matches your secret key

interface Step {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
}

interface FormData {
  firstName: string;
  lastName: string;
  suffix: string;
  username: string;
  birthdate: string;
  countryCode: string;
  contactNumber: string;
  email: string;
  password: string;
  confirmPassword: string;
  agreeToTerms: boolean;
  captchaResponse: string;
}

interface PasswordChecks {
  length: boolean;
  uppercase: boolean;
  lowercase: boolean;
  number: boolean;
  special: boolean;
  match: boolean;
}

// Utility function to safely check if a string is empty
const isEmptyString = (value: any): boolean => {
  return (
    value === null ||
    value === undefined ||
    value === "" ||
    (typeof value === "string" && value.trim() === "")
  );
};

// Utility function to safely get string value
const safeString = (value: any): string => {
  if (value === null || value === undefined) return "";
  return String(value);
};

const SignUpPage = () => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [formData, setFormData] = useState<FormData>({
    firstName: "",
    lastName: "",
    suffix: "",
    username: "",
    birthdate: "",
    countryCode: "+63",
    contactNumber: "",
    email: "",
    password: "",
    confirmPassword: "",
    agreeToTerms: false,
    captchaResponse: "",
  });

  const [message, setMessage] = useState("");
  const [showAlert, setShowAlert] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [passwordChecks, setPasswordChecks] = useState<PasswordChecks>({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false,
    match: false,
  });
  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({});

  const router = useRouter();

  // Country codes for phone numbers
  const countryCodes = [
    { code: "+63", country: "Philippines", flag: "🇵🇭", maxDigits: 10 },
    { code: "+1", country: "United States", flag: "🇺🇸", maxDigits: 10 },
    { code: "+44", country: "United Kingdom", flag: "🇬🇧", maxDigits: 10 },
    { code: "+81", country: "Japan", flag: "🇯🇵", maxDigits: 11 },
    { code: "+82", country: "South Korea", flag: "🇰🇷", maxDigits: 11 },
  ];

  // Define steps
  const steps: Step[] = [
    {
      id: "personal-info",
      title: "Personal Information",
      description: "Tell us about yourself",
      icon: User,
    },
    {
      id: "account-details",
      title: "Account Details",
      description: "Create your account credentials",
      icon: Mail,
    },
    {
      id: "security",
      title: "Security & Terms",
      description: "Secure your account and agree to terms",
      icon: Shield,
    },
  ];

  const currentStep = steps[currentStepIndex];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === steps.length - 1;

  // Check if user is already logged in
  useEffect(() => {
    const user = localStorage.getItem("user");
    if (user) {
      try {
        const userData = JSON.parse(user);
        const userRole = userData.user_role.toLowerCase();

        if (userRole === "admin") {
          router.push("/admin/dashboard");
        } else if (userRole === "client") {
          router.push("/client/dashboard");
        } else if (userRole === "organizer") {
          router.push("/organizer/dashboard");
        } else if (userRole === "supplier") {
          router.push("/supplier/dashboard");
        }
      } catch (error) {
        console.error("Error parsing user data:", error);
        localStorage.removeItem("user");
      }
    }
  }, [router]);

  // Auto-generate username suggestion - with proper safety checks
  useEffect(() => {
    const firstName = safeString(formData.firstName);
    const lastName = safeString(formData.lastName);
    const currentUsername = safeString(formData.username);

    if (firstName && lastName && !currentUsername) {
      const suggestion = `${firstName.toLowerCase()}${lastName.toLowerCase()}${Math.floor(Math.random() * 100)}`;
      setFormData((prev) => ({ ...prev, username: suggestion }));
    }
  }, [formData.firstName, formData.lastName]);

  // Validate password
  useEffect(() => {
    const password = safeString(formData.password);
    const confirmPassword = safeString(formData.confirmPassword);

    setPasswordChecks({
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
      match: password === confirmPassword && password.length > 0,
    });
  }, [formData.password, formData.confirmPassword]);

  // Robust input change handler with proper error handling
  const handleInputChange = useCallback(
    (field: keyof FormData, value: string | boolean) => {
      try {
        // Special handling for contact number
        if (field === "contactNumber") {
          // Only allow digits and limit based on country code
          const digitValue = safeString(value).replace(/\D/g, "");
          const selectedCountry = countryCodes.find(
            (c) => c.code === formData.countryCode
          );
          const maxDigits = selectedCountry?.maxDigits || 10;

          if (digitValue.length <= maxDigits) {
            setFormData((prev) => ({ ...prev, [field]: digitValue }));
          }
        } else {
          // Ensure we always have a valid value
          const safeValue =
            field === "agreeToTerms" ? Boolean(value) : safeString(value);
          setFormData((prev) => ({ ...prev, [field]: safeValue }));
        }

        // Clear field error when user starts typing
        if (fieldErrors[field]) {
          setFieldErrors((prev) => ({ ...prev, [field]: "" }));
        }
      } catch (error) {
        console.error(`Error updating field ${field}:`, error);
      }
    },
    [formData.countryCode, fieldErrors, countryCodes]
  );

  const handleCaptchaChange = useCallback((token: string | null) => {
    setFormData((prev) => ({ ...prev, captchaResponse: token || "" }));
  }, []);

  // Comprehensive validation with bulletproof error handling
  const validateCurrentStep = useCallback((): boolean => {
    const errors: { [key: string]: string } = {};

    try {
      switch (currentStepIndex) {
        case 0: // Personal Information
          // First Name validation with multiple safety checks
          const firstName = safeString(formData.firstName);
          if (isEmptyString(firstName)) {
            errors.firstName = "First name is required";
          } else if (firstName.length < 1) {
            errors.firstName = "First name must be at least 1 character";
          } else if (firstName.length > 50) {
            errors.firstName = "First name cannot exceed 50 characters";
          }

          // Last Name validation with multiple safety checks
          const lastName = safeString(formData.lastName);
          if (isEmptyString(lastName)) {
            errors.lastName = "Last name is required";
          } else if (lastName.length < 1) {
            errors.lastName = "Last name must be at least 1 character";
          } else if (lastName.length > 50) {
            errors.lastName = "Last name cannot exceed 50 characters";
          }

          // Birthdate validation
          const birthdate = safeString(formData.birthdate);
          if (isEmptyString(birthdate)) {
            errors.birthdate = "Birthdate is required";
          } else {
            const today = new Date();
            const birthDate = new Date(birthdate);
            const age = today.getFullYear() - birthDate.getFullYear();
            if (age < 13) {
              errors.birthdate = "You must be at least 13 years old";
            }
          }
          break;

        case 1: // Account Details
          // Username validation
          const username = safeString(formData.username);
          if (isEmptyString(username)) {
            errors.username = "Username is required";
          } else if (username.length < 3) {
            errors.username = "Username must be at least 3 characters";
          } else if (username.length > 20) {
            errors.username = "Username cannot exceed 20 characters";
          } else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            errors.username =
              "Username can only contain letters, numbers, and underscores";
          }

          // Email validation
          const email = safeString(formData.email);
          if (isEmptyString(email)) {
            errors.email = "Email is required";
          } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            errors.email = "Please enter a valid email address";
          } else if (email.length > 100) {
            errors.email = "Email cannot exceed 100 characters";
          }

          // Contact number validation
          const contactNumber = safeString(formData.contactNumber);
          if (isEmptyString(contactNumber)) {
            errors.contactNumber = "Contact number is required";
          } else {
            const selectedCountry = countryCodes.find(
              (c) => c.code === formData.countryCode
            );
            const minDigits = formData.countryCode === "+63" ? 10 : 9;
            const maxDigits = selectedCountry?.maxDigits || 10;

            if (contactNumber.length < minDigits) {
              errors.contactNumber = `Contact number must be at least ${minDigits} digits`;
            } else if (contactNumber.length > maxDigits) {
              errors.contactNumber = `Contact number cannot exceed ${maxDigits} digits`;
            } else if (!/^\d+$/.test(contactNumber)) {
              errors.contactNumber = "Contact number must contain only digits";
            }
          }
          break;

        case 2: // Security & Terms
          // Password validation
          const password = safeString(formData.password);
          if (isEmptyString(password)) {
            errors.password = "Password is required";
          } else if (!Object.values(passwordChecks).every((check) => check)) {
            errors.password = "Password does not meet all requirements";
          }

          // Confirm password validation
          const confirmPassword = safeString(formData.confirmPassword);
          if (isEmptyString(confirmPassword)) {
            errors.confirmPassword = "Please confirm your password";
          } else if (password !== confirmPassword) {
            errors.confirmPassword = "Passwords do not match";
          }

          // Terms and conditions validation
          if (!formData.agreeToTerms) {
            errors.agreeToTerms = "You must agree to the Terms and Conditions";
          }

          // CAPTCHA validation
          const captchaResponse = safeString(formData.captchaResponse);
          if (isEmptyString(captchaResponse)) {
            errors.captchaResponse = "Please complete the CAPTCHA verification";
          }
          break;

        default:
          console.error("Invalid step index:", currentStepIndex);
          break;
      }
    } catch (error) {
      console.error("Validation error:", error);
      errors.general = "An error occurred during validation. Please try again.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }, [currentStepIndex, formData, passwordChecks, countryCodes]);

  const handleNext = useCallback(() => {
    if (!validateCurrentStep()) {
      return;
    }

    // Mark current step as completed
    if (!completedSteps.includes(currentStep.id)) {
      setCompletedSteps((prev) => [...prev, currentStep.id]);
    }

    if (isLastStep) {
      handleSubmit();
    } else {
      setCurrentStepIndex((prev) => prev + 1);
    }
  }, [validateCurrentStep, completedSteps, currentStep.id, isLastStep]);

  const handlePrevious = useCallback(() => {
    if (!isFirstStep) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  }, [isFirstStep]);

  const handleStepClick = useCallback((index: number) => {
    if (isClickable(index)) {
      setCurrentStepIndex(index);
    }
  }, []);

  const getStepStatus = useCallback(
    (index: number) => {
      if (completedSteps.includes(steps[index].id)) {
        return "completed";
      }
      if (index === currentStepIndex) {
        return "current";
      }
      return "upcoming";
    },
    [completedSteps, currentStepIndex]
  );

  const isClickable = useCallback(
    (index: number) => {
      return (
        index <= currentStepIndex || completedSteps.includes(steps[index].id)
      );
    },
    [currentStepIndex, completedSteps]
  );

  const handleSubmit = async () => {
    if (!validateCurrentStep()) {
      return;
    }

    setIsLoading(true);
    setMessage("");
    setShowAlert(false);

    // CAPTCHA validation (like working login page)
    if (!formData.captchaResponse) {
      setMessage("⚠ Please complete the CAPTCHA.");
      setShowAlert(true);
      setIsLoading(false);
      return;
    }

    try {
      // Use exact same FormData pattern as working login page
      const formDataToSend = new FormData();
      formDataToSend.append("operation", "register");
      formDataToSend.append("firstName", formData.firstName.trim());
      formDataToSend.append("lastName", formData.lastName.trim());
      formDataToSend.append("suffix", formData.suffix.trim());
      formDataToSend.append("username", formData.username.trim());
      formDataToSend.append("birthdate", formData.birthdate);
      formDataToSend.append(
        "contactNumber",
        `${formData.countryCode}${formData.contactNumber}`
      );
      formDataToSend.append("email", formData.email.trim().toLowerCase());
      formDataToSend.append("password", formData.password);
      formDataToSend.append("userRole", "client");
      formDataToSend.append("captcha", formData.captchaResponse); // Same as login

      console.log("Signup request data:", {
        operation: "register",
        email: formData.email.trim().toLowerCase(),
        captcha: formData.captchaResponse ? "present" : "missing",
      });

      const response = await axios.post(`${API_URL}/auth.php`, formDataToSend, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      console.log("Signup response:", response.data); // Debug log like login

      if (response.data.status === "success") {
        // Store user_id and email in cookie for OTP verification (same pattern as login)
        const userData = response.data.user;
        document.cookie = `pending_signup_user_id=${userData.user_id}; path=/`;
        document.cookie = `pending_signup_email=${userData.email}; path=/`;

        // Debug log for cookie setting (like login)
        console.log("Setting signup cookies:", {
          user_id: userData.user_id,
          email: userData.email,
          cookies: document.cookie,
        });

        // Show success message like login
        setMessage(
          response.data.message ||
            "Registration successful! Please check your email."
        );
        setShowAlert(true);

        // Show success modal
        setShowSuccessModal(true);

        // Redirect to OTP verification (like login)
        setTimeout(() => {
          router.push("/auth/verify-signup-otp");
        }, 3000);
      } else {
        // Simple error handling like login
        setMessage(
          response.data.message || "⚠ Registration failed. Please try again."
        );
        setShowAlert(true);
      }
    } catch (error: any) {
      console.error("Registration error:", error);
      setMessage("⚠ Error during registration. Please try again.");
      setShowAlert(true);
    } finally {
      setIsLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStepIndex) {
      case 0:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* First Name */}
              <div>
                <label
                  htmlFor="firstName"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="firstName"
                  type="text"
                  value={formData.firstName}
                  onChange={(e) =>
                    handleInputChange("firstName", e.target.value)
                  }
                  placeholder="Enter your first name"
                  className={cn(
                    "w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#028A75] focus:border-transparent",
                    fieldErrors.firstName ? "border-red-500" : "border-gray-300"
                  )}
                />
                {fieldErrors.firstName && (
                  <p className="mt-1 text-sm text-red-500">
                    {fieldErrors.firstName}
                  </p>
                )}
              </div>

              {/* Last Name */}
              <div>
                <label
                  htmlFor="lastName"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="lastName"
                  type="text"
                  value={formData.lastName}
                  onChange={(e) =>
                    handleInputChange("lastName", e.target.value)
                  }
                  placeholder="Enter your last name"
                  className={cn(
                    "w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#028A75] focus:border-transparent",
                    fieldErrors.lastName ? "border-red-500" : "border-gray-300"
                  )}
                />
                {fieldErrors.lastName && (
                  <p className="mt-1 text-sm text-red-500">
                    {fieldErrors.lastName}
                  </p>
                )}
              </div>
            </div>

            {/* Suffix */}
            <div>
              <label
                htmlFor="suffix"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Suffix <span className="text-gray-400">(Optional)</span>
              </label>
              <select
                id="suffix"
                value={formData.suffix}
                onChange={(e) => handleInputChange("suffix", e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#028A75] focus:border-transparent"
              >
                <option value="">Select suffix (optional)</option>
                <option value="Jr.">Jr.</option>
                <option value="Sr.">Sr.</option>
                <option value="II">II</option>
                <option value="III">III</option>
                <option value="IV">IV</option>
              </select>
            </div>

            {/* Birthdate */}
            <div>
              <label
                htmlFor="birthdate"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                <Calendar className="inline h-4 w-4 mr-1" />
                Birthdate <span className="text-gray-400">(Optional)</span>
              </label>
              <input
                id="birthdate"
                type="date"
                value={formData.birthdate}
                onChange={(e) => handleInputChange("birthdate", e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#028A75] focus:border-transparent"
              />
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-6">
            {/* Username */}
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                <UserCheck className="inline h-4 w-4 mr-1" />
                Username <span className="text-red-500">*</span>
              </label>
              <input
                id="username"
                type="text"
                value={formData.username}
                onChange={(e) => handleInputChange("username", e.target.value)}
                placeholder="Choose a unique username"
                className={cn(
                  "w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#028A75] focus:border-transparent",
                  fieldErrors.username ? "border-red-500" : "border-gray-300"
                )}
              />
              {fieldErrors.username && (
                <p className="mt-1 text-sm text-red-500">
                  {fieldErrors.username}
                </p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                This will be your unique identifier for login
              </p>
            </div>

            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                <Mail className="inline h-4 w-4 mr-1" />
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                placeholder="Enter your email address"
                className={cn(
                  "w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#028A75] focus:border-transparent",
                  fieldErrors.email ? "border-red-500" : "border-gray-300"
                )}
              />
              {fieldErrors.email && (
                <p className="mt-1 text-sm text-red-500">{fieldErrors.email}</p>
              )}
            </div>

            {/* Contact Number with Country Code */}
            <div>
              <label
                htmlFor="contactNumber"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                <Phone className="inline h-4 w-4 mr-1" />
                Contact Number <span className="text-red-500">*</span>
              </label>
              <div className="flex">
                {/* Country Code Selector */}
                <div className="relative">
                  <select
                    value={formData.countryCode}
                    onChange={(e) =>
                      handleInputChange("countryCode", e.target.value)
                    }
                    className="h-[52px] px-3 pr-8 border border-r-0 border-gray-300 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-[#028A75] focus:border-transparent bg-gray-50 appearance-none"
                  >
                    {countryCodes.map((country) => (
                      <option key={country.code} value={country.code}>
                        {country.flag} {country.code}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                </div>

                {/* Phone Number Input */}
                <input
                  id="contactNumber"
                  type="tel"
                  value={formData.contactNumber}
                  onChange={(e) =>
                    handleInputChange("contactNumber", e.target.value)
                  }
                  placeholder={
                    formData.countryCode === "+63"
                      ? "9123456789"
                      : "Enter number"
                  }
                  className={cn(
                    "flex-1 px-4 py-3 border border-l-0 rounded-r-lg focus:outline-none focus:ring-2 focus:ring-[#028A75] focus:border-transparent",
                    fieldErrors.contactNumber
                      ? "border-red-500"
                      : "border-gray-300"
                  )}
                />
              </div>
              {fieldErrors.contactNumber && (
                <p className="mt-1 text-sm text-red-500">
                  {fieldErrors.contactNumber}
                </p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                {formData.countryCode === "+63"
                  ? "Enter 10 digits (e.g., 9123456789 for +63 912 345 6789)"
                  : `Enter ${countryCodes.find((c) => c.code === formData.countryCode)?.maxDigits || 10} digits max`}
              </p>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) =>
                    handleInputChange("password", e.target.value)
                  }
                  placeholder="Create a strong password"
                  className={cn(
                    "w-full px-4 py-3 pr-12 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#028A75] focus:border-transparent",
                    fieldErrors.password ? "border-red-500" : "border-gray-300"
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>

              {/* Password Requirements */}
              {formData.password && (
                <div className="mt-2 space-y-1">
                  <div
                    className={`flex items-center text-xs ${passwordChecks.length ? "text-green-600" : "text-red-500"}`}
                  >
                    {passwordChecks.length ? (
                      <CheckIcon className="w-3 h-3 mr-1" />
                    ) : (
                      <XIcon className="w-3 h-3 mr-1" />
                    )}
                    At least 8 characters
                  </div>
                  <div
                    className={`flex items-center text-xs ${passwordChecks.uppercase ? "text-green-600" : "text-red-500"}`}
                  >
                    {passwordChecks.uppercase ? (
                      <CheckIcon className="w-3 h-3 mr-1" />
                    ) : (
                      <XIcon className="w-3 h-3 mr-1" />
                    )}
                    One uppercase letter
                  </div>
                  <div
                    className={`flex items-center text-xs ${passwordChecks.lowercase ? "text-green-600" : "text-red-500"}`}
                  >
                    {passwordChecks.lowercase ? (
                      <CheckIcon className="w-3 h-3 mr-1" />
                    ) : (
                      <XIcon className="w-3 h-3 mr-1" />
                    )}
                    One lowercase letter
                  </div>
                  <div
                    className={`flex items-center text-xs ${passwordChecks.number ? "text-green-600" : "text-red-500"}`}
                  >
                    {passwordChecks.number ? (
                      <CheckIcon className="w-3 h-3 mr-1" />
                    ) : (
                      <XIcon className="w-3 h-3 mr-1" />
                    )}
                    One number
                  </div>
                  <div
                    className={`flex items-center text-xs ${passwordChecks.special ? "text-green-600" : "text-red-500"}`}
                  >
                    {passwordChecks.special ? (
                      <CheckIcon className="w-3 h-3 mr-1" />
                    ) : (
                      <XIcon className="w-3 h-3 mr-1" />
                    )}
                    One special character
                  </div>
                </div>
              )}

              {fieldErrors.password && (
                <p className="mt-1 text-sm text-red-500">
                  {fieldErrors.password}
                </p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Confirm Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={formData.confirmPassword}
                  onChange={(e) =>
                    handleInputChange("confirmPassword", e.target.value)
                  }
                  placeholder="Confirm your password"
                  className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#028A75] focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>

              {formData.confirmPassword && (
                <div
                  className={`mt-1 flex items-center text-xs ${passwordChecks.match ? "text-green-600" : "text-red-500"}`}
                >
                  {passwordChecks.match ? (
                    <CheckIcon className="w-3 h-3 mr-1" />
                  ) : (
                    <XIcon className="w-3 h-3 mr-1" />
                  )}
                  Passwords match
                </div>
              )}
            </div>

            {/* Terms and Conditions */}
            <div>
              <div className="flex items-start space-x-3">
                <input
                  id="agreeToTerms"
                  type="checkbox"
                  checked={formData.agreeToTerms}
                  onChange={(e) =>
                    handleInputChange("agreeToTerms", e.target.checked)
                  }
                  className="mt-1 h-4 w-4 text-[#028A75] focus:ring-[#028A75] border-gray-300 rounded"
                />
                <label htmlFor="agreeToTerms" className="text-sm text-gray-700">
                  I agree to the{" "}
                  <Link href="#" className="text-[#028A75] hover:underline">
                    Terms and Conditions
                  </Link>{" "}
                  and{" "}
                  <Link href="#" className="text-[#028A75] hover:underline">
                    Privacy Policy
                  </Link>
                  <span className="text-red-500 ml-1">*</span>
                </label>
              </div>
              {fieldErrors.agreeToTerms && (
                <p className="mt-1 text-sm text-red-500">
                  {fieldErrors.agreeToTerms}
                </p>
              )}
            </div>

            {/* reCAPTCHA */}
            <div className="flex justify-center">
              <ReCAPTCHA sitekey={SITE_KEY} onChange={handleCaptchaChange} />
            </div>
            {fieldErrors.captchaResponse && (
              <p className="mt-1 text-sm text-red-500 text-center">
                {fieldErrors.captchaResponse}
              </p>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  // Stepper Component
  const renderStepper = () => {
    return (
      <div className="mb-8">
        <div className="flex items-center justify-center space-x-8">
          {steps.map((step, index) => {
            const status = getStepStatus(index);
            const clickable = isClickable(index);
            const IconComponent = step.icon;

            return (
              <div key={step.id} className="flex flex-col items-center">
                {/* Step Circle and Line Row */}
                <div className="flex items-center">
                  {/* Step Circle */}
                  <div className="relative">
                    {status === "current" ? (
                      // Current step: border circle with inner filled circle
                      <div
                        className="relative cursor-pointer transition-all duration-300 hover:scale-105"
                        onClick={() => clickable && handleStepClick(index)}
                      >
                        <div className="w-11 h-11 rounded-full border-4 border-[#028A75] bg-transparent" />
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[#028A75] flex items-center justify-center">
                          <IconComponent className="h-3 w-3 text-white" />
                        </div>
                      </div>
                    ) : (
                      // Completed and pending: solid circles
                      <div
                        className={cn(
                          "w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer",
                          {
                            "bg-[#028A75] text-white": status === "completed",
                            "bg-[#DADADA] text-gray-600": status === "upcoming",
                            "hover:scale-105": clickable,
                            "cursor-not-allowed": !clickable,
                          }
                        )}
                        onClick={() => clickable && handleStepClick(index)}
                      >
                        {status === "completed" ? (
                          <Check
                            className="h-6 w-6 text-white"
                            strokeWidth={2}
                          />
                        ) : (
                          <IconComponent className="h-5 w-5" />
                        )}
                      </div>
                    )}
                  </div>

                  {/* Connecting Line */}
                  {index < steps.length - 1 && (
                    <div className="flex items-center ml-4">
                      <div className="relative h-1 w-[72px]">
                        {/* Background Line */}
                        <div className="absolute inset-0 bg-[#DADADA] rounded-sm" />
                        {/* Progress Line */}
                        <div
                          className={cn(
                            "absolute inset-0 bg-[#028A75] rounded-sm transition-all duration-500",
                            {
                              "w-full": index < currentStepIndex,
                              "w-0": index >= currentStepIndex,
                            }
                          )}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Step Labels */}
                <div className="mt-3 text-center">
                  <div className="text-xs font-medium text-[#C7C7C7] uppercase tracking-wide">
                    STEP {index + 1}
                  </div>
                  <div
                    className={cn(
                      "text-sm font-medium mt-1 transition-colors",
                      {
                        "text-[#87878A]": true,
                      }
                    )}
                  >
                    {step.title}
                  </div>
                  <div
                    className={cn(
                      "text-sm mt-1 font-medium transition-colors",
                      {
                        "text-[#028A75]":
                          status === "completed" || status === "current",
                        "text-[#DADADA]": status === "upcoming",
                      }
                    )}
                  >
                    {status === "completed"
                      ? "Completed"
                      : status === "current"
                        ? "In Progress"
                        : "Upcoming"}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <>
      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap");
        body {
          font-family: "Inter", sans-serif;
        }
      `}</style>

      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="w-full max-w-4xl">
          {/* Logo */}
          <div className="text-center mb-8">
            <Image
              src={Logo}
              alt="Logo"
              width={120}
              height={120}
              className="mx-auto mb-4"
              priority
            />
            <h1 className="text-3xl font-bold text-gray-900">Create Account</h1>
            <p className="text-gray-600 mt-2">
              Join us to start planning amazing events
            </p>
          </div>

          {/* Multi-Step Form */}
          <div className="bg-white rounded-lg shadow-xl overflow-hidden">
            {/* Stepper */}
            <div className="px-8 py-6 bg-gray-50 border-b">
              {renderStepper()}
            </div>

            {/* Step Content */}
            <div className="p-8">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  {currentStep.title}
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  {currentStep.description}
                </p>
              </div>

              {renderStepContent()}

              {/* Navigation Buttons */}
              <div className="flex justify-between mt-8 pt-6 border-t">
                <button
                  type="button"
                  onClick={handlePrevious}
                  disabled={isFirstStep}
                  className="flex items-center px-6 py-3 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Previous
                </button>

                <div className="text-sm text-gray-500 flex items-center">
                  Step {currentStepIndex + 1} of {steps.length}
                </div>

                <button
                  type="button"
                  onClick={handleNext}
                  disabled={isLoading}
                  className="flex items-center px-6 py-3 bg-[#028A75] text-white rounded-lg hover:bg-[#026B5C] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoading ? (
                    "Creating Account..."
                  ) : isLastStep ? (
                    "Create Account"
                  ) : (
                    <>
                      Next
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Login Link */}
            <div className="px-8 pb-6 text-center">
              <p className="text-sm text-gray-600">
                Already have an account?{" "}
                <Link
                  href="/auth/login"
                  className="text-[#028A75] hover:underline font-medium"
                >
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </div>

        <SlidingAlert
          message={message}
          show={showAlert}
          onClose={() => setShowAlert(false)}
        />

        {/* Success Modal */}
        {showSuccessModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full mx-4">
              <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                  <CheckIcon className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Account Created Successfully!
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  We've sent a verification code to your email address. Please
                  check your inbox and enter the code to complete your
                  registration.
                </p>
                <p className="text-xs text-gray-500">
                  Redirecting to verification page...
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default SignUpPage;
