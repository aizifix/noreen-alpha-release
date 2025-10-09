"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import axios from "axios";
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
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://noreen-events.online/noreen-events";

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
  birthdate: string;
  countryCode: string;
  contactNumber: string;
  email: string;
  password: string;
  confirmPassword: string;
  agreeToTerms: boolean;
  mathAnswer: string;
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
    birthdate: "",
    countryCode: "+63",
    contactNumber: "",
    email: "",
    password: "",
    confirmPassword: "",
    agreeToTerms: false,
    mathAnswer: "",
  });

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
  const [dataRestored, setDataRestored] = useState(false);

  // Math challenge state
  const [mathChallenge, setMathChallenge] = useState({ num1: 0, num2: 0 });
  const [mathValidation, setMathValidation] = useState<
    "none" | "correct" | "incorrect"
  >("none");

  const router = useRouter();

  // Function to clear saved form data
  const clearSavedData = () => {
    try {
      localStorage.removeItem("signup_form_data");
      console.log("Cleared saved signup data");
    } catch (error) {
      console.error("Error clearing saved signup data:", error);
    }
  };

  // Generate a simple math challenge
  const generateMathChallenge = () => {
    const num1 = Math.floor(Math.random() * 9) + 1;
    const num2 = Math.floor(Math.random() * 9) + 1;
    setMathChallenge({ num1, num2 });
    setFormData((prev) => ({ ...prev, mathAnswer: "" }));
    setMathValidation("none");
  };

  // Generate math challenge on component mount
  useEffect(() => {
    generateMathChallenge();
  }, []);

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

  // Check if user is already logged in (use secureStorage for consistency)
  useEffect(() => {
    try {
      const userData: any =
        require("@/app/utils/encryption").secureStorage.getItem("user");
      const role = (userData?.user_role || "").toLowerCase();
      if (role === "admin") {
        router.push("/admin/dashboard");
      } else if (role === "client") {
        router.push("/client/dashboard");
      } else if (role === "organizer" || role === "vendor") {
        router.push("/organizer/dashboard");
      }
    } catch (_e) {
      // ignore
    }
  }, [router]);

  // Load saved form data on component mount
  useEffect(() => {
    try {
      const savedData = localStorage.getItem("signup_form_data");
      if (savedData) {
        const parsedData = JSON.parse(savedData);
        setFormData((prev) => ({ ...prev, ...parsedData }));
        setDataRestored(true);
        console.log("Loaded saved signup data:", parsedData);

        // Show a toast notification that data was restored
        toast({
          title: "Form data restored",
          description:
            "Your previous form data has been restored. You can continue where you left off.",
        });
      }
    } catch (error) {
      console.error("Error loading saved signup data:", error);
    }
  }, []);

  // Save form data to localStorage whenever it changes
  useEffect(() => {
    const saveData = () => {
      try {
        localStorage.setItem("signup_form_data", JSON.stringify(formData));
      } catch (error) {
        console.error("Error saving signup data:", error);
      }
    };

    // Debounce the save operation
    const timeoutId = setTimeout(saveData, 500);
    return () => clearTimeout(timeoutId);
  }, [formData]);

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

  // Handle math challenge answer with real-time validation
  const handleMathAnswerChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const answer = e.target.value;
      setFormData((prev) => ({ ...prev, mathAnswer: answer }));

      if (answer) {
        const correctAnswer = mathChallenge.num1 + mathChallenge.num2;
        if (parseInt(answer) === correctAnswer) {
          setMathValidation("correct");
        } else {
          setMathValidation("incorrect");
        }
      } else {
        setMathValidation("none");
      }
    },
    [mathChallenge]
  );

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

          // Birthdate validation - industry standard
          const birthdate = safeString(formData.birthdate);
          if (isEmptyString(birthdate)) {
            errors.birthdate = "Birthdate is required";
          } else {
            const today = new Date();
            const birthDate = new Date(birthdate);

            // Check if birthdate is valid
            if (isNaN(birthDate.getTime())) {
              errors.birthdate = "Please enter a valid birthdate";
            } else {
              // Calculate age more accurately
              let age = today.getFullYear() - birthDate.getFullYear();
              const monthDiff = today.getMonth() - birthDate.getMonth();
              if (
                monthDiff < 0 ||
                (monthDiff === 0 && today.getDate() < birthDate.getDate())
              ) {
                age--;
              }

              if (birthDate > today) {
                errors.birthdate = "Birthdate cannot be in the future";
              } else if (age < 13) {
                errors.birthdate = `You must be at least 13 years old to register (current age: ${age} years)`;
              } else if (age > 120) {
                errors.birthdate = "Please enter a valid birthdate";
              }
              // No error message for valid age - let it pass
            }
          }
          break;

        case 1: // Account Details
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

          // Math challenge validation
          const mathAnswer = safeString(formData.mathAnswer);
          if (isEmptyString(mathAnswer)) {
            errors.mathAnswer = "Please solve the math problem";
          } else {
            const correctAnswer = mathChallenge.num1 + mathChallenge.num2;
            if (parseInt(mathAnswer) !== correctAnswer) {
              errors.mathAnswer = "Incorrect answer. Please try again.";
            }
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

    // Math challenge validation
    const correctAnswer = mathChallenge.num1 + mathChallenge.num2;
    if (parseInt(formData.mathAnswer) !== correctAnswer) {
      toast({
        title: "Incorrect Math Answer",
        description: "Please solve the math problem correctly.",
        variant: "destructive",
      });
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
      formDataToSend.append("birthdate", formData.birthdate);
      formDataToSend.append(
        "contactNumber",
        `${formData.countryCode}${formData.contactNumber}`
      );
      formDataToSend.append("email", formData.email.trim().toLowerCase());
      formDataToSend.append("password", formData.password);
      formDataToSend.append("userRole", "client");
      formDataToSend.append("mathAnswer", formData.mathAnswer); // Math challenge instead of captcha
      formDataToSend.append("captcha", formData.mathAnswer); // Backend expects captcha field

      console.log("Signup request data:", {
        operation: "register",
        email: formData.email.trim().toLowerCase(),
        mathAnswer: formData.mathAnswer,
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
        toast({
          title: "Registration successful",
          description:
            response.data.message || "Please check your email for the OTP.",
        });

        // Show success modal
        setShowSuccessModal(true);

        // Redirect to OTP verification (like login)
        setTimeout(() => {
          router.push("/auth/verify-signup-otp");
        }, 3000);
      } else {
        toast({
          title: "Registration failed",
          description: response.data.message || "Please try again.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Registration error:", error);
      toast({
        title: "Registration error",
        description: "Error during registration. Please try again.",
        variant: "destructive",
      });
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
                Birthdate <span className="text-red-500">*</span>
              </label>
              <input
                id="birthdate"
                type="date"
                value={formData.birthdate}
                onChange={(e) => handleInputChange("birthdate", e.target.value)}
                className={cn(
                  "w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#028A75] focus:border-transparent",
                  fieldErrors.birthdate ? "border-red-500" : "border-gray-300"
                )}
              />
              {fieldErrors.birthdate && (
                <p className="mt-1 text-sm text-red-500">
                  {fieldErrors.birthdate}
                </p>
              )}
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-6">
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

            {/* Math Challenge */}
            <div className="flex flex-col items-center p-4 border rounded-lg bg-gray-50">
              <label className="mb-2 text-sm font-medium text-gray-700">
                Please solve this simple math problem:
              </label>
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 bg-white border rounded-md text-lg font-medium w-12 h-12 flex items-center justify-center">
                  {mathChallenge.num1}
                </div>
                <div className="text-lg font-medium">+</div>
                <div className="p-2 bg-white border rounded-md text-lg font-medium w-12 h-12 flex items-center justify-center">
                  {mathChallenge.num2}
                </div>
                <div className="text-lg font-medium">=</div>
                <input
                  type="number"
                  className={`p-2 border rounded-md w-16 h-12 text-center text-lg font-medium focus:ring-2 focus:ring-[#334746] focus:border-transparent transition-all duration-200 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                    mathValidation === "correct"
                      ? "border-green-500 bg-green-50 ring-2 ring-green-200"
                      : mathValidation === "incorrect"
                        ? "border-red-500 bg-red-50 ring-2 ring-red-200"
                        : "border-gray-300"
                  }`}
                  value={formData.mathAnswer}
                  onChange={handleMathAnswerChange}
                  required
                />
              </div>
              {fieldErrors.mathAnswer && (
                <p className="mt-1 text-sm text-red-500 text-center">
                  {fieldErrors.mathAnswer}
                </p>
              )}
            </div>
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
                {dataRestored && (
                  <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center">
                      <CheckIcon className="h-4 w-4 text-green-600 mr-2" />
                      <p className="text-sm text-green-800">
                        Your previous form data has been restored. You can
                        continue where you left off.
                      </p>
                    </div>
                  </div>
                )}
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
