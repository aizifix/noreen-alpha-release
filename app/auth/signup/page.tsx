"use client";

import type React from "react";
import { useState, useEffect } from "react";
import axios from "axios";
import ReCAPTCHA from "react-google-recaptcha";
import { CheckIcon, XIcon } from "lucide-react";
import SuccessModal from "../../components/modals/SuccessModal";
import Image from "next/image";
import Logo from "../../../public/logo.png";
import { SlidingAlert } from "../../components/ui/sliding-alert";
import PublicNavbar from "@/app/components/PublicNavbar";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost/events-api";
const SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || "";

const sendFormData = async (formDataToSend: FormData) => {
  try {
    console.log("Sending Form Data:", Array.from(formDataToSend.entries())); // Debugging log

    const response = await axios.post(`${API_URL}/auth.php`, formDataToSend, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    console.log("API Response:", response.data); // Debugging log
    return response.data;
  } catch (error) {
    console.error("API Error:", error);
    return { status: "error", message: "Something went wrong" };
  }
};

const SignUpPage: React.FC = () => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    suffix: "",
    birthdate: "",
    email: "",
    password: "",
    confirmPassword: "",
    businessName: "",
    businessAddress: "",
    businessType: "",
    website: "",
    vatId: "",
    vendorAddress: "",
    vendorContactNumber: "",
    vendorDocuments: null as File | null,
    vendorNotes: "",
    captchaResponse: "",
    termsAccepted: false,
    user_contact: "",
  });

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [passwordChecks, setPasswordChecks] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false,
    match: false,
  });
  const [checkingPassword, setCheckingPassword] = useState(false);

  const steps = [
    "Personal Info",
    "Account Details",
    "Business Info",
    "Vendor Info",
    "Review",
  ];

  // Password validation
  useEffect(() => {
    setCheckingPassword(true);
    const timer = setTimeout(() => {
      const checks = {
        length: formData.password.length >= 8,
        uppercase: /[A-Z]/.test(formData.password),
        lowercase: /[a-z]/.test(formData.password),
        number: /[0-9]/.test(formData.password),
        special: /[!@#$%^&*(),.?":{}|<>]/.test(formData.password),
        match:
          formData.password === formData.confirmPassword &&
          formData.password !== "",
      };
      setPasswordChecks(checks);
      setCheckingPassword(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [formData.password, formData.confirmPassword]);

  // Handle input changes
  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        type === "checkbox"
          ? (e.target as HTMLInputElement).checked
          : type === "file"
            ? (e.target as HTMLInputElement).files?.[0] || null
            : value,
    }));
  };

  // Add this function near your other handlers
  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    // Allow typing any number, but clean it afterwards
    const cleaned = value.replace(/[^\d]/g, "");

    // Update only if empty or starts with 09 and within length limit
    if (cleaned.length <= 11) {
      setFormData((prev) => ({
        ...prev,
        [name]: cleaned,
      }));
    }
  };

  // Handle CAPTCHA
  const handleCaptchaChange = (token: string | null) => {
    setFormData((prev) => ({ ...prev, captchaResponse: token || "" }));
  };

  // Check if email is unique before proceeding
  const checkEmail = async () => {
    setMessage(""); // Clear previous messages
    setShowAlert(false);

    const trimmedEmail = formData.email.trim();

    if (!trimmedEmail) {
      setMessage("Email is required.");
      setShowAlert(true);
      return;
    }

    // Check if all password requirements are met
    const allPasswordChecksPassed = Object.values(passwordChecks).every(
      (check) => check
    );
    if (!allPasswordChecksPassed) {
      setMessage("Please ensure all password requirements are met.");
      setShowAlert(true);
      return;
    }

    setCheckingEmail(true); // Show loading state

    try {
      console.log("Checking email:", trimmedEmail); // Debugging log

      const response = await axios.post(
        `${API_URL}/auth.php`,
        { operation: "check_email", email: trimmedEmail },
        { headers: { "Content-Type": "application/json" } }
      );

      console.log("API Response:", response.data); // Debugging

      if (response.data.exists) {
        setMessage("Email is already taken. Please use another email address.");
        setShowAlert(true);
        return; // Stop here, don't proceed
      }

      setStep(3); // Only proceed if email is available
    } catch (error) {
      console.error("Error checking email:", error);
      setMessage("Error checking email. Please try again.");
      setShowAlert(true);
    } finally {
      setCheckingEmail(false); // Hide loading state
    }
  };

  // Password requirement check renderer
  const renderPasswordCheck = (label: string, check: boolean) => (
    <div className="flex items-center space-x-2">
      {checkingPassword ? (
        <div className="w-4 h-4 animate-pulse bg-gray-200 rounded-full" />
      ) : check ? (
        <CheckIcon className="w-4 h-4 text-green-500" />
      ) : (
        <XIcon className="w-4 h-4 text-red-500" />
      )}
      <span className={`text-sm ${check ? "text-green-500" : "text-red-500"}`}>
        {label}
      </span>
    </div>
  );

  // Move to the next step
  const nextStep = () => {
    setMessage("");

    switch (step) {
      case 1:
        if (
          !formData.firstName ||
          !formData.lastName ||
          !formData.birthdate ||
          !formData.email ||
          !formData.user_contact
        ) {
          setMessage("Please fill out all required fields.");
          setShowAlert(true);
          return;
        }
        // Add phone number validation
        if (!/^09\d{9}$/.test(formData.user_contact)) {
          setMessage(
            "Please enter a valid Philippine mobile number (09XXXXXXXXX)"
          );
          setShowAlert(true);
          return;
        }
        // Add email validation
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
          setMessage("Please enter a valid email address.");
          setShowAlert(true);
          return;
        }
        setStep(2);
        break;

      case 2:
        if (!formData.password || !formData.confirmPassword) {
          setMessage("Please complete all fields.");
          setShowAlert(true);
          return;
        }
        checkEmail(); // Check email availability before proceeding
        break;

      case 3:
        if (
          !formData.businessName ||
          !formData.businessAddress ||
          !formData.businessType
        ) {
          setMessage("Please complete business information.");
          setShowAlert(true);
          return;
        }
        break;

      case 4:
        if (!formData.vendorAddress || !formData.vendorContactNumber) {
          setMessage("Please complete vendor information.");
          setShowAlert(true);
          return;
        }
        break;

      default:
        return;
    }

    setStep(step + 1);
  };

  // Move to the previous step
  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  // Submit form
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!formData.termsAccepted || !formData.captchaResponse) {
      setMessage("Complete CAPTCHA and accept terms");
      setShowAlert(true);
      return;
    }

    setLoading(true);
    try {
      const formDataToSend = new FormData();
      formDataToSend.append("operation", "register");

      for (const [key, value] of Object.entries(formData)) {
        if (key === "vendorDocuments" && value instanceof File) {
          formDataToSend.append(key, value);
        } else if (typeof value === "boolean") {
          formDataToSend.append(key, value.toString());
        } else if (value !== null && value !== undefined) {
          formDataToSend.append(key, value.toString());
        }
      }

      const response = await sendFormData(formDataToSend);

      if (response.status === "success") {
        setShowSuccessModal(true);
      } else {
        setMessage(response.message);
        setShowAlert(true);
      }
    } catch (error) {
      setMessage("Registration failed. Please try again.");
      setShowAlert(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSuccessModalClose = () => {
    setShowSuccessModal(false);
    // Redirect to login page
    window.location.href = "/auth/login";
  };

  const renderReviewSection = () => (
    <div className="space-y-4 max-h-96 overflow-y-auto">
      <h2 className="text-xl font-semibold mb-4">Review Your Information</h2>
      <div className="space-y-2">
        <h3 className="font-semibold">Personal Info:</h3>
        <p>
          Name: {formData.firstName} {formData.lastName} {formData.suffix}
        </p>
        <p>Birthdate: {formData.birthdate}</p>
        <p>Email: {formData.email}</p>
        <p>Contact: {formData.user_contact}</p>

        <h3 className="font-semibold mt-4">Account Details:</h3>
        <p>Password: {formData.password}</p>

        <h3 className="font-semibold mt-4">Business Info:</h3>
        <p>Business Name: {formData.businessName}</p>
        <p>Business Address: {formData.businessAddress}</p>
        <p>Business Type: {formData.businessType}</p>
        <p>Website: {formData.website || "N/A"}</p>
        <p>VAT ID: {formData.vatId}</p>

        <h3 className="font-semibold mt-4">Vendor Info:</h3>
        <p>Vendor Address: {formData.vendorAddress}</p>
        <p>Vendor Contact Number: {formData.vendorContactNumber}</p>
        <p>
          Vendor Documents:{" "}
          {formData.vendorDocuments
            ? formData.vendorDocuments.name
            : "No document uploaded"}
        </p>
        <p>Vendor Notes: {formData.vendorNotes || "N/A"}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <PublicNavbar currentPage="signup" />

      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center flex-col p-6">
        <Image
          src={Logo || "/placeholder.svg"}
          alt="Logo"
          className="mb-6"
          width={150}
          height={150}
        />
        <div className="w-full max-w-2xl bg-white p-8 rounded-lg shadow-xl border-0">
          <h1 className="text-2xl font-bold text-gray-800 text-left mb-6">
            Sign up
          </h1>

          <div className="relative mb-8">
            <div className="absolute top-5 left-0 right-0 flex justify-between px-20">
              {steps.slice(0, -1).map((_, index) => (
                <div
                  key={index}
                  className={`h-[3px] w-[25%] ${
                    step > index + 1 ? "bg-[#334746]" : "bg-gray-300"
                  }`}
                />
              ))}
            </div>

            <ul className="flex justify-between relative z-10">
              {steps.map((label, index) => (
                <li
                  key={index}
                  className="flex flex-col items-center"
                  style={{ width: "20%" }}
                >
                  <div
                    className={`w-10 h-10 flex items-center justify-center rounded-full ${
                      step > index + 1
                        ? "bg-[#334746] text-white"
                        : step === index + 1
                          ? "bg-[#334746] text-white"
                          : "bg-gray-300 text-gray-600"
                    }`}
                  >
                    {step > index + 1 ? (
                      <CheckIcon className="w-5 h-5" />
                    ) : (
                      <span className="text-sm">{index + 1}</span>
                    )}
                  </div>
                  <span className="text-sm mt-2 text-center">{label}</span>
                </li>
              ))}
            </ul>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {step === 1 && (
              <>
                <div className="flex gap-3">
                  <div className="w-full">
                    <label
                      htmlFor="firstName"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      First Name
                    </label>
                    <input
                      id="firstName"
                      type="text"
                      name="firstName"
                      placeholder="First Name"
                      value={formData.firstName}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#334746]"
                      required
                    />
                  </div>
                  <div className="w-full">
                    <label
                      htmlFor="lastName"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Last Name
                    </label>
                    <input
                      id="lastName"
                      type="text"
                      name="lastName"
                      placeholder="Last Name"
                      value={formData.lastName}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#334746]"
                      required
                    />
                  </div>
                  <div className="w-full">
                    <label
                      htmlFor="suffix"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Suffix (optional)
                    </label>
                    <input
                      id="suffix"
                      type="text"
                      name="suffix"
                      placeholder="Suffix (optional)"
                      value={formData.suffix}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#334746]"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="birthdate"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Birthdate
                  </label>
                  <input
                    id="birthdate"
                    type="date"
                    name="birthdate"
                    value={formData.birthdate}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#334746]"
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    name="email"
                    placeholder="Email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#334746]"
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="user_contact"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Contact Number
                    <span className="text-xs text-gray-500 ml-1">
                      (Format: 09XXXXXXXXX)
                    </span>
                  </label>
                  <input
                    id="user_contact"
                    type="text" // Changed from type="tel" to type="text"
                    name="user_contact"
                    placeholder="09XXXXXXXXX"
                    value={formData.user_contact}
                    onChange={handlePhoneNumberChange}
                    maxLength={11}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#334746]"
                    required
                  />
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <div>
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    name="password"
                    placeholder="Password"
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#334746]"
                    required
                  />
                  <div className="mt-2 space-y-1">
                    {renderPasswordCheck(
                      "At least 8 characters",
                      passwordChecks.length
                    )}
                    {renderPasswordCheck(
                      "Contains uppercase letter",
                      passwordChecks.uppercase
                    )}
                    {renderPasswordCheck(
                      "Contains lowercase letter",
                      passwordChecks.lowercase
                    )}
                    {renderPasswordCheck(
                      "Contains number",
                      passwordChecks.number
                    )}
                    {renderPasswordCheck(
                      "Contains special character",
                      passwordChecks.special
                    )}
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Confirm Password
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    name="confirmPassword"
                    placeholder="Confirm Password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#334746]"
                    required
                  />
                  <div className="mt-2">
                    {renderPasswordCheck(
                      "Passwords match",
                      passwordChecks.match
                    )}
                  </div>
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <div>
                  <label
                    htmlFor="businessName"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Business Name
                  </label>
                  <input
                    id="businessName"
                    type="text"
                    name="businessName"
                    placeholder="Business Name"
                    value={formData.businessName}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#334746]"
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="businessAddress"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Business Address
                  </label>
                  <input
                    id="businessAddress"
                    type="text"
                    name="businessAddress"
                    placeholder="Business Address"
                    value={formData.businessAddress}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#334746]"
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="businessType"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Business Type
                  </label>
                  <select
                    id="businessType"
                    name="businessType"
                    value={formData.businessType}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#334746]"
                    required
                  >
                    <option value="">Select Business Type</option>
                    <option value="sole_proprietorship">
                      Sole Proprietorship
                    </option>
                    <option value="partnership">Partnership</option>
                    <option value="corporation">Corporation</option>
                    <option value="llc">LLC</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="website"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Website (optional)
                  </label>
                  <input
                    id="website"
                    type="url"
                    name="website"
                    placeholder="Website (optional)"
                    value={formData.website}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#334746]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="vatId"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    VAT ID (optional)
                  </label>
                  <input
                    id="vatId"
                    type="text"
                    name="vatId"
                    placeholder="VAT ID (optional)"
                    value={formData.vatId}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#334746]"
                  />
                </div>
              </>
            )}

            {step === 4 && (
              <>
                <div>
                  <label
                    htmlFor="vendorAddress"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Vendor Address
                  </label>
                  <input
                    id="vendorAddress"
                    type="text"
                    name="vendorAddress"
                    placeholder="Vendor Address"
                    value={formData.vendorAddress}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#334746]"
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="vendorContactNumber"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Vendor Contact Number
                    <span className="text-xs text-gray-500 ml-1">
                      (Format: 09XXXXXXXXX)
                    </span>
                  </label>
                  <input
                    id="vendorContactNumber"
                    type="text" // Changed from type="tel" to type="text"
                    name="vendorContactNumber"
                    placeholder="09XXXXXXXXX"
                    value={formData.vendorContactNumber}
                    onChange={handlePhoneNumberChange}
                    maxLength={11}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#334746]"
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="vendorDocuments"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Vendor Documents
                  </label>
                  <input
                    id="vendorDocuments"
                    type="file"
                    name="vendorDocuments"
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#334746]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="vendorNotes"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Additional Notes (optional)
                  </label>
                  <textarea
                    id="vendorNotes"
                    name="vendorNotes"
                    placeholder="Additional Notes (optional)"
                    value={formData.vendorNotes}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#334746]"
                  />
                </div>
              </>
            )}

            {step === 5 && (
              <>
                {renderReviewSection()}
                <div className="space-y-4 mt-4">
                  <ReCAPTCHA
                    sitekey={SITE_KEY}
                    onChange={handleCaptchaChange}
                  />
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="termsAccepted"
                      name="termsAccepted"
                      checked={formData.termsAccepted}
                      onChange={handleChange}
                      className="mr-2"
                      required
                    />
                    <label htmlFor="termsAccepted">
                      I accept the{" "}
                      <a
                        href="/terms"
                        className="text-blue-600 hover:underline"
                      >
                        Terms and Conditions
                      </a>
                    </label>
                  </div>
                </div>
              </>
            )}

            <div className="flex justify-between">
              {step > 1 && (
                <button
                  type="button"
                  className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg"
                  onClick={prevStep}
                >
                  Previous
                </button>
              )}
              {step === 1 && (
                <button
                  type="button"
                  className="bg-[white] border border-[#334746] text-[#334746] hover:bg-[#334746] hover:text-[white] px-6 py-2 rounded-lg"
                  onClick={() => (window.location.href = "/")}
                >
                  Cancel
                </button>
              )}
              {step < 5 ? (
                <button
                  type="button"
                  className="bg-[#334746] text-white px-6 py-2 rounded-lg"
                  onClick={nextStep}
                  disabled={checkingEmail}
                >
                  {checkingEmail ? "Checking..." : "Next"}
                </button>
              ) : (
                <button
                  type="submit"
                  className="bg-[#334746] text-white px-6 py-2 rounded-lg"
                  disabled={
                    loading ||
                    !formData.captchaResponse ||
                    !formData.termsAccepted
                  }
                >
                  {loading ? "Submitting..." : "Submit"}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>

      {showSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <SuccessModal
            message="Registration successful!"
            onClose={handleSuccessModalClose}
            actionLabel="Go to Login"
          />
        </div>
      )}
      <SlidingAlert
        message={message}
        show={showAlert}
        onClose={() => setShowAlert(false)}
      />
    </div>
  );
};

export default SignUpPage;
