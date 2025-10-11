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
  MapPin,
  ChevronLeft,
  ChevronRight,
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
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
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
    street: "",
    city: "",
    state: "",
    postalCode: "",
    country: "Philippines",
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

  // Mobile and animation state
  const [isMobile, setIsMobile] = useState(false);
  const [slideDirection, setSlideDirection] = useState<
    "left" | "right" | "none"
  >("none");
  const [isAnimating, setIsAnimating] = useState(false);

  const router = useRouter();

  // Helper function for mobile-optimized input styling
  const getInputClassName = (hasError: boolean) => {
    return cn(
      "w-full border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#028A75] focus:border-transparent transition-all duration-200",
      isMobile ? "px-4 py-4 text-base" : "px-4 py-3.5",
      hasError
        ? "border-red-500 bg-red-50/50 focus:ring-red-500"
        : "border-gray-300 bg-white hover:border-gray-400"
    );
  };

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

  // Mobile detection with debounce
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    let timeoutId: NodeJS.Timeout;
    const debouncedCheck = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(checkMobile, 150);
    };

    window.addEventListener("resize", debouncedCheck);
    return () => {
      window.removeEventListener("resize", debouncedCheck);
      clearTimeout(timeoutId);
    };
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
      id: "address-info",
      title: "Address Information",
      description: "Where are you located?",
      icon: MapPin,
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

        // Check if this is a return from OTP verification (has pending cookies)
        const hasPendingSignup = document.cookie.includes(
          "pending_signup_user_id"
        );

        if (hasPendingSignup) {
          // This is a return from OTP verification - show different message
          toast({
            title: "Form data restored",
            description:
              "Your form data has been restored. You can edit your details and register again.",
          });
        } else {
          // This is a normal page load with saved data
          toast({
            title: "Form data restored",
            description:
              "Your previous form data has been restored. You can continue where you left off.",
          });
        }
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
        } else if (field === "firstName" || field === "lastName") {
          // Capitalize first letter for names
          const stringValue = safeString(value);
          const capitalizedValue =
            stringValue.charAt(0).toUpperCase() + stringValue.slice(1);
          setFormData((prev) => ({ ...prev, [field]: capitalizedValue }));
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

        case 1: // Address Information
          // Street validation
          const street = safeString(formData.street);
          if (isEmptyString(street)) {
            errors.street = "Street address is required";
          } else if (street.length < 5) {
            errors.street = "Please enter a complete street address";
          } else if (street.length > 100) {
            errors.street = "Street address cannot exceed 100 characters";
          }

          // City validation
          const city = safeString(formData.city);
          if (isEmptyString(city)) {
            errors.city = "City is required";
          } else if (city.length < 2) {
            errors.city = "Please enter a valid city name";
          } else if (city.length > 50) {
            errors.city = "City name cannot exceed 50 characters";
          }

          // State validation
          const state = safeString(formData.state);
          if (isEmptyString(state)) {
            errors.state = "State/Province is required";
          } else if (state.length < 2) {
            errors.state = "Please enter a valid state/province";
          } else if (state.length > 50) {
            errors.state = "State/Province cannot exceed 50 characters";
          }

          // Postal code validation
          const postalCode = safeString(formData.postalCode);
          if (isEmptyString(postalCode)) {
            errors.postalCode = "Postal code is required";
          } else if (postalCode.length < 3) {
            errors.postalCode = "Please enter a valid postal code";
          } else if (postalCode.length > 20) {
            errors.postalCode = "Postal code cannot exceed 20 characters";
          }

          // Country validation
          const country = safeString(formData.country);
          if (isEmptyString(country)) {
            errors.country = "Country is required";
          }
          break;

        case 2: // Account Details
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

        case 3: // Security & Terms
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
      if (isMobile) {
        setSlideDirection("left");
        setIsAnimating(true);
        setTimeout(() => {
          setCurrentStepIndex((prev) => prev + 1);
          setSlideDirection("none");
          setIsAnimating(false);
        }, 150);
      } else {
        setCurrentStepIndex((prev) => prev + 1);
      }
    }
  }, [
    validateCurrentStep,
    completedSteps,
    currentStep.id,
    isLastStep,
    isMobile,
  ]);

  const handlePrevious = useCallback(() => {
    if (!isFirstStep) {
      if (isMobile) {
        setSlideDirection("right");
        setIsAnimating(true);
        setTimeout(() => {
          setCurrentStepIndex((prev) => prev - 1);
          setSlideDirection("none");
          setIsAnimating(false);
        }, 150);
      } else {
        setCurrentStepIndex((prev) => prev - 1);
      }
    }
  }, [isFirstStep, isMobile]);

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
      formDataToSend.append("street", formData.street.trim());
      formDataToSend.append("city", formData.city.trim());
      formDataToSend.append("state", formData.state.trim());
      formDataToSend.append("postalCode", formData.postalCode.trim());
      formDataToSend.append("country", formData.country.trim());
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
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        street: formData.street.trim(),
        city: formData.city.trim(),
        state: formData.state.trim(),
        postalCode: formData.postalCode.trim(),
        country: formData.country.trim(),
        email: formData.email.trim().toLowerCase(),
        contactNumber: `${formData.countryCode}${formData.contactNumber}`,
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

        // Save form data for potential editing (don't clear it yet)
        // The data will be cleared only after successful OTP verification
        try {
          localStorage.setItem("signup_form_data", JSON.stringify(formData));
          console.log("Saved form data for potential editing:", formData);
        } catch (error) {
          console.error("Error saving form data:", error);
        }

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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* First Name */}
              <div className="space-y-2">
                <label
                  htmlFor="firstName"
                  className="block text-sm font-semibold text-gray-700"
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
                  className={getInputClassName(!!fieldErrors.firstName)}
                />
                {fieldErrors.firstName && (
                  <p className="mt-1.5 text-sm text-red-600 flex items-center">
                    <XIcon className="h-4 w-4 mr-1" />
                    {fieldErrors.firstName}
                  </p>
                )}
              </div>

              {/* Last Name */}
              <div className="space-y-2">
                <label
                  htmlFor="lastName"
                  className="block text-sm font-semibold text-gray-700"
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
                  className={getInputClassName(!!fieldErrors.lastName)}
                />
                {fieldErrors.lastName && (
                  <p className="mt-1.5 text-sm text-red-600 flex items-center">
                    <XIcon className="h-4 w-4 mr-1" />
                    {fieldErrors.lastName}
                  </p>
                )}
              </div>
            </div>

            {/* Suffix */}
            <div className="space-y-2">
              <label
                htmlFor="suffix"
                className="block text-sm font-semibold text-gray-700"
              >
                Suffix{" "}
                <span className="text-gray-400 font-normal text-xs">
                  (Optional)
                </span>
              </label>
              <select
                id="suffix"
                value={formData.suffix}
                onChange={(e) => handleInputChange("suffix", e.target.value)}
                className={cn(
                  "w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#028A75] focus:border-transparent bg-white hover:border-gray-400 transition-all duration-200",
                  isMobile ? "px-4 py-4 text-base" : "px-4 py-3.5"
                )}
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
            <div className="space-y-2">
              <label
                htmlFor="birthdate"
                className="flex items-center text-sm font-semibold text-gray-700"
              >
                <Calendar className="h-4 w-4 mr-1.5 text-[#028A75]" />
                Birthdate <span className="text-red-500 ml-1">*</span>
              </label>
              <input
                id="birthdate"
                type="date"
                value={formData.birthdate}
                onChange={(e) => handleInputChange("birthdate", e.target.value)}
                className={getInputClassName(!!fieldErrors.birthdate)}
              />
              {fieldErrors.birthdate && (
                <p className="mt-1.5 text-sm text-red-600 flex items-center">
                  <XIcon className="h-4 w-4 mr-1" />
                  {fieldErrors.birthdate}
                </p>
              )}
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-6">
            {/* Street Address */}
            <div className="space-y-2">
              <label
                htmlFor="street"
                className="flex items-center text-sm font-semibold text-gray-700"
              >
                <MapPin className="h-4 w-4 mr-1.5 text-[#028A75]" />
                Street Address <span className="text-red-500 ml-1">*</span>
              </label>
              <input
                id="street"
                type="text"
                value={formData.street}
                onChange={(e) => handleInputChange("street", e.target.value)}
                placeholder="123 Main Street, Building/Apt #"
                className={getInputClassName(!!fieldErrors.street)}
              />
              {fieldErrors.street && (
                <p className="mt-1.5 text-sm text-red-600 flex items-center">
                  <XIcon className="h-4 w-4 mr-1" />
                  {fieldErrors.street}
                </p>
              )}
            </div>

            {/* City and State Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* City */}
              <div className="space-y-2">
                <label
                  htmlFor="city"
                  className="block text-sm font-semibold text-gray-700"
                >
                  City <span className="text-red-500">*</span>
                </label>
                <input
                  id="city"
                  type="text"
                  value={formData.city}
                  onChange={(e) => handleInputChange("city", e.target.value)}
                  placeholder="Enter your city"
                  className={getInputClassName(!!fieldErrors.city)}
                />
                {fieldErrors.city && (
                  <p className="mt-1.5 text-sm text-red-600 flex items-center">
                    <XIcon className="h-4 w-4 mr-1" />
                    {fieldErrors.city}
                  </p>
                )}
              </div>

              {/* State/Province */}
              <div className="space-y-2">
                <label
                  htmlFor="state"
                  className="block text-sm font-semibold text-gray-700"
                >
                  State/Province <span className="text-red-500">*</span>
                </label>
                <input
                  id="state"
                  type="text"
                  value={formData.state}
                  onChange={(e) => handleInputChange("state", e.target.value)}
                  placeholder="Enter your state/province"
                  className={getInputClassName(!!fieldErrors.state)}
                />
                {fieldErrors.state && (
                  <p className="mt-1.5 text-sm text-red-600 flex items-center">
                    <XIcon className="h-4 w-4 mr-1" />
                    {fieldErrors.state}
                  </p>
                )}
              </div>
            </div>

            {/* Postal Code and Country Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Postal Code */}
              <div className="space-y-2">
                <label
                  htmlFor="postalCode"
                  className="block text-sm font-semibold text-gray-700"
                >
                  Postal Code <span className="text-red-500">*</span>
                </label>
                <input
                  id="postalCode"
                  type="text"
                  value={formData.postalCode}
                  onChange={(e) =>
                    handleInputChange("postalCode", e.target.value)
                  }
                  placeholder="Enter postal code"
                  className={getInputClassName(!!fieldErrors.postalCode)}
                />
                {fieldErrors.postalCode && (
                  <p className="mt-1.5 text-sm text-red-600 flex items-center">
                    <XIcon className="h-4 w-4 mr-1" />
                    {fieldErrors.postalCode}
                  </p>
                )}
              </div>

              {/* Country */}
              <div className="space-y-2">
                <label
                  htmlFor="country"
                  className="block text-sm font-semibold text-gray-700"
                >
                  Country <span className="text-red-500">*</span>
                </label>
                <select
                  id="country"
                  value={formData.country}
                  onChange={(e) => handleInputChange("country", e.target.value)}
                  className={cn(
                    "w-full border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#028A75] focus:border-transparent bg-white hover:border-gray-400 transition-all duration-200",
                    isMobile ? "px-4 py-4 text-base" : "px-4 py-3.5",
                    fieldErrors.country
                      ? "border-red-500 bg-red-50/50"
                      : "border-gray-300"
                  )}
                >
                  <option value="Philippines">🇵🇭 Philippines</option>
                  <option value="United States">🇺🇸 United States</option>
                  <option value="United Kingdom">🇬🇧 United Kingdom</option>
                  <option value="Japan">🇯🇵 Japan</option>
                  <option value="South Korea">🇰🇷 South Korea</option>
                  <option value="Canada">🇨🇦 Canada</option>
                  <option value="Australia">🇦🇺 Australia</option>
                  <option value="Singapore">🇸🇬 Singapore</option>
                  <option value="Malaysia">🇲🇾 Malaysia</option>
                  <option value="Thailand">🇹🇭 Thailand</option>
                  <option value="Indonesia">🇮🇩 Indonesia</option>
                  <option value="Vietnam">🇻🇳 Vietnam</option>
                  <option value="Other">Other</option>
                </select>
                {fieldErrors.country && (
                  <p className="mt-1.5 text-sm text-red-600 flex items-center">
                    <XIcon className="h-4 w-4 mr-1" />
                    {fieldErrors.country}
                  </p>
                )}
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            {/* Email */}
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="flex items-center text-sm font-semibold text-gray-700"
              >
                <Mail className="h-4 w-4 mr-1.5 text-[#028A75]" />
                Email Address <span className="text-red-500 ml-1">*</span>
              </label>
              <input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                placeholder="your.email@example.com"
                className={getInputClassName(!!fieldErrors.email)}
              />
              {fieldErrors.email && (
                <p className="mt-1.5 text-sm text-red-600 flex items-center">
                  <XIcon className="h-4 w-4 mr-1" />
                  {fieldErrors.email}
                </p>
              )}
            </div>

            {/* Contact Number with Country Code */}
            <div className="space-y-2">
              <label
                htmlFor="contactNumber"
                className="flex items-center text-sm font-semibold text-gray-700"
              >
                <Phone className="h-4 w-4 mr-1.5 text-[#028A75]" />
                Contact Number <span className="text-red-500 ml-1">*</span>
              </label>
              <div className="flex gap-0">
                {/* Country Code Selector */}
                <div className="relative">
                  <select
                    value={formData.countryCode}
                    onChange={(e) =>
                      handleInputChange("countryCode", e.target.value)
                    }
                    className={cn(
                      "border border-r-0 border-gray-300 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-[#028A75] focus:border-transparent focus:z-10 bg-gray-50 hover:bg-gray-100 appearance-none transition-all duration-200",
                      isMobile
                        ? "h-[56px] px-3 pr-8 text-base"
                        : "h-[54px] px-3 pr-8"
                    )}
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
                    "flex-1 border rounded-r-lg focus:outline-none focus:ring-2 focus:ring-[#028A75] focus:border-transparent transition-all duration-200 bg-white hover:border-gray-400",
                    isMobile ? "px-4 py-4 text-base" : "px-4 py-3.5",
                    fieldErrors.contactNumber
                      ? "border-red-500 bg-red-50/50 focus:ring-red-500"
                      : "border-gray-300"
                  )}
                />
              </div>
              {fieldErrors.contactNumber && (
                <p className="mt-1.5 text-sm text-red-600 flex items-center">
                  <XIcon className="h-4 w-4 mr-1" />
                  {fieldErrors.contactNumber}
                </p>
              )}
              <p className="mt-1.5 text-xs text-gray-500 flex items-center">
                <span className="inline-block w-1 h-1 rounded-full bg-gray-400 mr-2"></span>
                {formData.countryCode === "+63"
                  ? "Enter 10 digits (e.g., 9123456789 for +63 912 345 6789)"
                  : `Enter ${countryCodes.find((c) => c.code === formData.countryCode)?.maxDigits || 10} digits max`}
              </p>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            {/* Password */}
            <div className="space-y-2">
              <label
                htmlFor="password"
                className="flex items-center text-sm font-semibold text-gray-700"
              >
                <Shield className="h-4 w-4 mr-1.5 text-[#028A75]" />
                Password <span className="text-red-500 ml-1">*</span>
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
                    "w-full pr-12 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#028A75] focus:border-transparent transition-all duration-200",
                    isMobile ? "px-4 py-4 text-base" : "px-4 py-3.5",
                    fieldErrors.password
                      ? "border-red-500 bg-red-50/50 focus:ring-red-500"
                      : "border-gray-300 bg-white hover:border-gray-400"
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center hover:bg-gray-50 rounded-r-lg transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  )}
                </button>
              </div>

              {/* Password Requirements */}
              {formData.password && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-xs font-semibold text-gray-700 mb-2">
                    Password requirements:
                  </p>
                  <div className="space-y-1.5">
                    <div
                      className={`flex items-center text-xs font-medium transition-colors ${passwordChecks.length ? "text-green-600" : "text-gray-500"}`}
                    >
                      {passwordChecks.length ? (
                        <CheckIcon className="w-3.5 h-3.5 mr-2" />
                      ) : (
                        <XIcon className="w-3.5 h-3.5 mr-2" />
                      )}
                      At least 8 characters
                    </div>
                    <div
                      className={`flex items-center text-xs font-medium transition-colors ${passwordChecks.uppercase ? "text-green-600" : "text-gray-500"}`}
                    >
                      {passwordChecks.uppercase ? (
                        <CheckIcon className="w-3.5 h-3.5 mr-2" />
                      ) : (
                        <XIcon className="w-3.5 h-3.5 mr-2" />
                      )}
                      One uppercase letter
                    </div>
                    <div
                      className={`flex items-center text-xs font-medium transition-colors ${passwordChecks.lowercase ? "text-green-600" : "text-gray-500"}`}
                    >
                      {passwordChecks.lowercase ? (
                        <CheckIcon className="w-3.5 h-3.5 mr-2" />
                      ) : (
                        <XIcon className="w-3.5 h-3.5 mr-2" />
                      )}
                      One lowercase letter
                    </div>
                    <div
                      className={`flex items-center text-xs font-medium transition-colors ${passwordChecks.number ? "text-green-600" : "text-gray-500"}`}
                    >
                      {passwordChecks.number ? (
                        <CheckIcon className="w-3.5 h-3.5 mr-2" />
                      ) : (
                        <XIcon className="w-3.5 h-3.5 mr-2" />
                      )}
                      One number
                    </div>
                    <div
                      className={`flex items-center text-xs font-medium transition-colors ${passwordChecks.special ? "text-green-600" : "text-gray-500"}`}
                    >
                      {passwordChecks.special ? (
                        <CheckIcon className="w-3.5 h-3.5 mr-2" />
                      ) : (
                        <XIcon className="w-3.5 h-3.5 mr-2" />
                      )}
                      One special character (!@#$%^&*...)
                    </div>
                  </div>
                </div>
              )}

              {fieldErrors.password && (
                <p className="mt-1.5 text-sm text-red-600 flex items-center">
                  <XIcon className="h-4 w-4 mr-1" />
                  {fieldErrors.password}
                </p>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-semibold text-gray-700"
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
                  className={cn(
                    "w-full pr-12 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#028A75] focus:border-transparent bg-white hover:border-gray-400 transition-all duration-200",
                    isMobile ? "px-4 py-4 text-base" : "px-4 py-3.5",
                    fieldErrors.confirmPassword
                      ? "border-red-500 bg-red-50/50"
                      : "border-gray-300"
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center hover:bg-gray-50 rounded-r-lg transition-colors"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  )}
                </button>
              </div>

              {formData.confirmPassword && (
                <div
                  className={`mt-2 flex items-center text-xs font-medium transition-colors ${passwordChecks.match ? "text-green-600" : "text-red-600"}`}
                >
                  {passwordChecks.match ? (
                    <CheckIcon className="w-3.5 h-3.5 mr-1.5" />
                  ) : (
                    <XIcon className="w-3.5 h-3.5 mr-1.5" />
                  )}
                  {passwordChecks.match
                    ? "Passwords match"
                    : "Passwords do not match"}
                </div>
              )}
            </div>

            {/* Terms and Conditions */}
            <div className="space-y-2">
              <div
                className={cn(
                  "flex items-start space-x-3 p-4 rounded-lg border transition-all duration-200",
                  fieldErrors.agreeToTerms
                    ? "border-red-200 bg-red-50/50"
                    : "border-gray-200 bg-gray-50/50 hover:bg-gray-50"
                )}
              >
                <input
                  id="agreeToTerms"
                  type="checkbox"
                  checked={formData.agreeToTerms}
                  onChange={(e) =>
                    handleInputChange("agreeToTerms", e.target.checked)
                  }
                  className="mt-0.5 h-5 w-5 text-[#028A75] focus:ring-[#028A75] border-gray-300 rounded cursor-pointer"
                />
                <label
                  htmlFor="agreeToTerms"
                  className="text-sm text-gray-700 cursor-pointer select-none"
                >
                  I agree to the{" "}
                  <Link
                    href="#"
                    className="text-[#028A75] hover:underline font-medium"
                  >
                    Terms and Conditions
                  </Link>{" "}
                  and{" "}
                  <Link
                    href="#"
                    className="text-[#028A75] hover:underline font-medium"
                  >
                    Privacy Policy
                  </Link>
                  <span className="text-red-500 ml-1">*</span>
                </label>
              </div>
              {fieldErrors.agreeToTerms && (
                <p className="mt-1.5 text-sm text-red-600 flex items-center px-1">
                  <XIcon className="h-4 w-4 mr-1" />
                  {fieldErrors.agreeToTerms}
                </p>
              )}
            </div>

            {/* Math Challenge */}
            <div className="space-y-2">
              <div className="flex flex-col items-center p-4 sm:p-5 border-2 border-dashed rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50">
                <label className="mb-3 text-xs sm:text-sm font-semibold text-gray-700 flex items-center text-center">
                  <Shield className="h-4 w-4 mr-1.5 text-[#028A75] flex-shrink-0" />
                  <span className="break-words">
                    Verify you're human - solve this math problem:
                  </span>
                </label>
                <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mb-2">
                  <div className="p-2 sm:p-3 bg-white border-2 border-gray-300 rounded-lg text-lg sm:text-xl font-bold w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center shadow-sm">
                    {mathChallenge.num1}
                  </div>
                  <div className="text-lg sm:text-xl font-bold text-[#028A75]">
                    +
                  </div>
                  <div className="p-2 sm:p-3 bg-white border-2 border-gray-300 rounded-lg text-lg sm:text-xl font-bold w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center shadow-sm">
                    {mathChallenge.num2}
                  </div>
                  <div className="text-lg sm:text-xl font-bold text-[#028A75]">
                    =
                  </div>
                  <input
                    type="number"
                    className={cn(
                      "border-2 rounded-lg text-center font-bold focus:ring-2 focus:border-transparent transition-all duration-200 shadow-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
                      "p-2 sm:p-3 w-16 sm:w-18 h-12 sm:h-14 text-lg sm:text-xl",
                      mathValidation === "correct"
                        ? "border-green-500 bg-green-50 ring-2 ring-green-300 text-green-700"
                        : mathValidation === "incorrect"
                          ? "border-red-500 bg-red-50 ring-2 ring-red-300 text-red-700"
                          : "border-gray-300 bg-white focus:ring-[#028A75]"
                    )}
                    value={formData.mathAnswer}
                    onChange={handleMathAnswerChange}
                    placeholder="?"
                    required
                  />
                  {mathValidation === "correct" && (
                    <CheckIcon className="h-5 w-5 sm:h-6 sm:w-6 text-green-600 animate-in zoom-in flex-shrink-0" />
                  )}
                  {mathValidation === "incorrect" && (
                    <XIcon className="h-5 w-5 sm:h-6 sm:w-6 text-red-600 animate-in zoom-in flex-shrink-0" />
                  )}
                </div>
                {fieldErrors.mathAnswer && (
                  <p className="mt-2 text-xs sm:text-sm text-red-600 text-center flex items-center justify-center">
                    <XIcon className="h-4 w-4 mr-1 flex-shrink-0" />
                    <span className="break-words">
                      {fieldErrors.mathAnswer}
                    </span>
                  </p>
                )}
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // Mobile Stepper Component
  const renderMobileStepper = () => {
    return (
      <div className="mb-4">
        {/* Mobile Progress Header */}
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={handlePrevious}
            disabled={isFirstStep || isAnimating}
            className={cn(
              "flex items-center justify-center w-8 h-8 rounded-full transition-all duration-200 border",
              isFirstStep || isAnimating
                ? "bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed"
                : "bg-white border-[#028A75] text-[#028A75] hover:bg-[#028A75] hover:text-white"
            )}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="text-center flex-1 mx-3">
            <div className="text-sm font-semibold text-[#028A75]">
              Step {currentStepIndex + 1} of {steps.length}
            </div>
            <div className="text-xs text-gray-600 mt-0.5">
              {currentStep.title}
            </div>
          </div>
          <div className="w-8 h-8" /> {/* Spacer for balance */}
        </div>

        {/* Mobile Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
          <div
            className="bg-[#028A75] h-2 rounded-full transition-all duration-500 ease-out"
            style={{
              width: `${((currentStepIndex + 1) / steps.length) * 100}%`,
            }}
          />
        </div>

        {/* Mobile Step Indicators */}
        <div className="flex justify-center space-x-1.5">
          {steps.map((_, index) => {
            const status = getStepStatus(index);
            return (
              <div
                key={index}
                className={cn("rounded-full transition-all duration-300", {
                  "w-6 h-2 bg-[#028A75]": status === "current",
                  "w-2 h-2 bg-[#028A75]": status === "completed",
                  "w-2 h-2 bg-gray-300": status === "upcoming",
                })}
              />
            );
          })}
        </div>
      </div>
    );
  };

  // Desktop Stepper Component
  const renderDesktopStepper = () => {
    return (
      <div className="mb-8">
        <div className="flex items-center justify-center space-x-6">
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
                        <div className="w-12 h-12 rounded-full border-4 border-[#028A75] bg-white shadow-lg" />
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[#028A75] flex items-center justify-center shadow-md">
                          <IconComponent className="h-3 w-3 text-white" />
                        </div>
                      </div>
                    ) : (
                      // Completed and pending: solid circles
                      <div
                        className={cn(
                          "w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer shadow-md",
                          {
                            "bg-[#028A75] text-white hover:bg-[#026B5C]":
                              status === "completed",
                            "bg-gray-200 text-gray-500 hover:bg-gray-300":
                              status === "upcoming",
                            "hover:scale-105 hover:shadow-lg": clickable,
                            "cursor-not-allowed opacity-60": !clickable,
                          }
                        )}
                        onClick={() => clickable && handleStepClick(index)}
                      >
                        {status === "completed" ? (
                          <Check
                            className="h-6 w-6 text-white"
                            strokeWidth={3}
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
                      <div className="relative h-1 w-[60px]">
                        {/* Background Line */}
                        <div className="absolute inset-0 bg-gray-200 rounded-full" />
                        {/* Progress Line */}
                        <div
                          className={cn(
                            "absolute inset-0 bg-[#028A75] rounded-full transition-all duration-500",
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
                <div className="mt-4 text-center max-w-[100px]">
                  <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                    STEP {index + 1}
                  </div>
                  <div
                    className={cn(
                      "text-sm font-semibold mt-1 transition-colors",
                      {
                        "text-gray-800": status === "current",
                        "text-gray-600": status === "completed",
                        "text-gray-400": status === "upcoming",
                      }
                    )}
                  >
                    {step.title}
                  </div>
                  <div
                    className={cn(
                      "text-xs mt-1.5 font-medium transition-colors px-3 py-1 rounded-full inline-block",
                      {
                        "text-green-700 bg-green-100": status === "completed",
                        "text-[#028A75] bg-[#028A75]/10": status === "current",
                        "text-gray-400 bg-gray-100": status === "upcoming",
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
      <div
        className={cn(
          "bg-white",
          isMobile
            ? "min-h-screen flex flex-col"
            : "min-h-screen flex items-center justify-center p-4"
        )}
      >
        {isMobile ? (
          /* Mobile Layout - Clean & Simple */
          <div className="flex flex-col min-h-screen">
            {/* Mobile Header */}
            <div className="flex-shrink-0 px-6 py-6 border-b border-gray-100">
              {/* Back Button */}
              <div className="mb-4">
                <Link
                  href="/"
                  className="inline-flex items-center text-gray-600 hover:text-[#028A75] transition-colors"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Home
                </Link>
              </div>
              <div className="text-center">
                <div className="mb-4">
                  <Image
                    src={Logo}
                    alt="Logo"
                    width={60}
                    height={60}
                    className="mx-auto"
                    priority
                  />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-1">
                  Create Account
                </h1>
                <p className="text-gray-600 text-sm">
                  Join us to start planning amazing events
                </p>
              </div>
            </div>

            {/* Mobile Stepper */}
            <div className="flex-shrink-0 px-6 py-4 bg-gray-50 border-b border-gray-100">
              {renderMobileStepper()}
            </div>

            {/* Mobile Content */}
            <div className="flex-1 px-6 py-6">
              {/* Step Header */}
              <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-900 mb-1">
                  {currentStep.title}
                </h2>
                <p className="text-sm text-gray-600">
                  {currentStep.description}
                </p>
              </div>

              {/* Data Restored Message */}
              {dataRestored && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-start">
                    <CheckIcon className="h-5 w-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-green-900 mb-1">
                        Form Data Restored
                      </p>
                      <p className="text-sm text-green-800">
                        {document.cookie.includes("pending_signup_user_id")
                          ? "Your form data has been restored. You can edit your details and register again."
                          : "Your previous form data has been restored. You can continue where you left off."}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Step Content */}
              <div
                className={cn(
                  "transition-all duration-300 ease-in-out",
                  isAnimating &&
                    slideDirection === "left" &&
                    "transform -translate-x-full opacity-0",
                  isAnimating &&
                    slideDirection === "right" &&
                    "transform translate-x-full opacity-0",
                  !isAnimating && "transform translate-x-0 opacity-100"
                )}
              >
                {renderStepContent()}
              </div>
            </div>

            {/* Mobile Navigation */}
            <div className="flex-shrink-0 px-6 py-4 border-t border-gray-100 bg-white">
              <div className="flex gap-3">
                {!isFirstStep && (
                  <button
                    type="button"
                    onClick={handlePrevious}
                    disabled={isAnimating}
                    className="flex-1 flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={isLoading || isAnimating}
                  className="flex-1 flex items-center justify-center px-4 py-3 bg-[#028A75] text-white rounded-lg hover:bg-[#026B5C] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-semibold"
                >
                  {isLoading ? (
                    <span className="flex items-center">
                      <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Creating...
                    </span>
                  ) : isLastStep ? (
                    <span className="flex items-center">
                      <UserCheck className="h-4 w-4 mr-2" />
                      Create Account
                    </span>
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
            <div className="flex-shrink-0 px-6 py-3 text-center bg-gray-50 border-t border-gray-100">
              <p className="text-sm text-gray-600">
                Already have an account?{" "}
                <Link
                  href="/auth/login"
                  className="text-[#028A75] hover:text-[#026B5C] hover:underline font-semibold transition-colors"
                >
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        ) : (
          /* Desktop Layout - Clean & Simple */
          <div className="w-full max-w-4xl">
            {/* Back Button */}
            <div className="mb-6">
              <Link
                href="/"
                className="inline-flex items-center text-gray-600 hover:text-[#028A75] transition-colors"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Home
              </Link>
            </div>

            {/* Logo and Header */}
            <div className="text-center mb-8">
              <div className="mb-6">
                <Image
                  src={Logo}
                  alt="Logo"
                  width={80}
                  height={80}
                  className="mx-auto"
                  priority
                />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Create Account
              </h1>
              <p className="text-gray-600">
                Join us to start planning amazing events
              </p>
            </div>

            {/* Multi-Step Form */}
            <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
              {/* Stepper */}
              <div className="px-8 py-6 bg-gray-50 border-b border-gray-200">
                {renderDesktopStepper()}
              </div>

              {/* Step Content */}
              <div className="p-8">
                {/* Step Header */}
                <div className="mb-6 pb-4 border-b border-gray-200">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    {currentStep.title}
                  </h2>
                  <p className="text-gray-600">{currentStep.description}</p>
                </div>

                {/* Data Restored Message */}
                {dataRestored && (
                  <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-start">
                      <CheckIcon className="h-5 w-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-green-900 mb-1">
                          Form Data Restored
                        </p>
                        <p className="text-sm text-green-800">
                          {document.cookie.includes("pending_signup_user_id")
                            ? "Your form data has been restored. You can edit your details and register again."
                            : "Your previous form data has been restored. You can continue where you left off."}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step Content */}
                <div>{renderStepContent()}</div>

                {/* Navigation */}
                <div className="flex justify-between items-center mt-8 pt-6 border-t">
                  <button
                    type="button"
                    onClick={handlePrevious}
                    disabled={isFirstStep}
                    className="flex items-center px-6 py-3 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Previous
                  </button>

                  <div className="text-sm font-semibold text-gray-600 bg-gray-100 px-4 py-2 rounded-full">
                    Step {currentStepIndex + 1} of {steps.length}
                  </div>

                  <button
                    type="button"
                    onClick={handleNext}
                    disabled={isLoading}
                    className="flex items-center px-6 py-3 bg-[#028A75] text-white rounded-lg hover:bg-[#026B5C] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-semibold"
                  >
                    {isLoading ? (
                      <span className="flex items-center">
                        <svg
                          className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        Creating Account...
                      </span>
                    ) : isLastStep ? (
                      <>
                        <UserCheck className="h-4 w-4 mr-2" />
                        Create Account
                      </>
                    ) : (
                      <>
                        Next Step
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Login Link */}
              <div className="px-8 pb-6 text-center bg-gray-50 border-t">
                <p className="text-sm text-gray-600 py-3">
                  Already have an account?{" "}
                  <Link
                    href="/auth/login"
                    className="text-[#028A75] hover:text-[#026B5C] hover:underline font-semibold transition-colors"
                  >
                    Sign in
                  </Link>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Success Modal */}
        {showSuccessModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full">
              <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
                  <CheckIcon className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">
                  Account Created Successfully!
                </h3>
                <p className="text-gray-600 mb-6">
                  We've sent a verification code to your email address. Please
                  check your inbox and enter the code to complete your
                  registration.
                </p>
                <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
                  <svg
                    className="animate-spin h-4 w-4 text-[#028A75]"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  <span>Redirecting to verification page...</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default SignUpPage;
