"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "@/hooks/use-toast";
import { api } from "@/app/config/api";
import Link from "next/link";

type Step = "email" | "otp" | "reset" | "done";

const ForgotPasswordPage = () => {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [isClient, setIsClient] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // shared state
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const otpRefs = useRef<(HTMLInputElement | null)[]>(new Array(6).fill(null));

  // math challenge
  const [num1, setNum1] = useState(0);
  const [num2, setNum2] = useState(0);
  const [answer, setAnswer] = useState("");
  const [answerState, setAnswerState] = useState<
    "none" | "correct" | "incorrect"
  >("none");

  useEffect(() => {
    setIsClient(true);
    regenerateMath();
  }, []);

  const regenerateMath = () => {
    setNum1(Math.floor(Math.random() * 9) + 1);
    setNum2(Math.floor(Math.random() * 9) + 1);
    setAnswer("");
    setAnswerState("none");
  };

  const validateMath = (value: string) => {
    setAnswer(value);
    if (value === "") return setAnswerState("none");
    const correct = num1 + num2;
    const user = parseInt(value, 10);
    if (!Number.isNaN(user))
      setAnswerState(user === correct ? "correct" : "incorrect");
  };

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast({ title: "Email required", variant: "destructive" });
      return;
    }
    const correct = num1 + num2;
    if (!answer || parseInt(answer, 10) !== correct) {
      toast({
        title: "Incorrect Answer",
        description: "Solve the math challenge.",
        variant: "destructive",
      });
      return;
    }
    setIsLoading(true);
    try {
      const res = await api.auth.requestForgotPassword(email.trim());
      if (res.data?.status === "success" || res.data?.status === "otp_sent") {
        toast({
          title: "Check your email",
          description: "Enter the 6-digit code.",
        });
        setStep("otp");
      } else {
        toast({
          title: "Request failed",
          description: res.data?.message || "Try again.",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Could not send request.";
      toast({
        title: "Error",
        description: msg,
        variant: "destructive",
      });
    } finally {
      regenerateMath();
      setIsLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
      // Handle paste
      const digits = value.replace(/\D/g, "").slice(0, 6).split("");
      const next = [...otp];
      digits.forEach((d, i) => {
        if (i < 6) next[i] = d;
      });
      setOtp(next);
      // Focus the next empty or last
      const nextIndex = Math.min(digits.length, 5);
      otpRefs.current[nextIndex]?.focus();
      return;
    }
    if (!/^\d?$/.test(value)) return;
    const next = [...otp];
    next[index] = value;
    setOtp(next);
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = otp.join("").trim();
    if (code.length !== 6) {
      toast({ title: "Enter full code", variant: "destructive" });
      return;
    }
    // We will verify OTP implicitly during reset to avoid extra roundtrip.
    setStep("reset");
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = otp.join("").trim();
    if (code.length !== 6) {
      toast({ title: "Enter full code", variant: "destructive" });
      return;
    }
    if (newPassword.length < 8) {
      toast({
        title: "Weak password",
        description: "Use at least 8 characters.",
        variant: "destructive",
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({
        title: "Mismatch",
        description: "Passwords do not match.",
        variant: "destructive",
      });
      return;
    }
    setIsLoading(true);
    try {
      const res = await api.auth.resetPasswordWithOtp({
        email: email.trim(),
        otp: code,
        newPassword: newPassword.trim(),
        confirmPassword: confirmPassword.trim(),
      });
      if (res.data?.status === "success") {
        toast({
          title: "Password updated",
          description: "You can now sign in.",
        });
        setStep("done");
        setTimeout(() => router.replace("/auth/login"), 1000);
      } else {
        toast({
          title: "Reset failed",
          description: res.data?.message || "Try again.",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Could not reset password.";
      toast({
        title: "Error",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isClient) return null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <motion.div
        className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="mb-4">
          <Link
            href="/auth/login"
            className="text-sm text-[#334746] hover:underline"
          >
            Back to login
          </Link>
        </div>

        {step === "email" && (
          <form onSubmit={handleRequest} className="space-y-5">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">
                Forgot password
              </h1>
              <p className="text-gray-600 text-sm">
                Enter your account email to receive a verification code.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#334746] focus:border-transparent"
              />
            </div>
            <div className="p-3 border rounded-lg bg-gray-50">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">
                  Solve the math problem
                </label>
                <button
                  type="button"
                  onClick={regenerateMath}
                  className="text-xs text-gray-600 hover:text-gray-800"
                >
                  Reset
                </button>
              </div>
              <div className="flex items-center gap-2">
                <div className="p-2 bg-white border rounded-md w-12 h-12 flex items-center justify-center text-lg font-medium">
                  {num1}
                </div>
                <div className="text-lg font-medium">+</div>
                <div className="p-2 bg-white border rounded-md w-12 h-12 flex items-center justify-center text-lg font-medium">
                  {num2}
                </div>
                <div className="text-lg font-medium">=</div>
                <input
                  type="number"
                  value={answer}
                  onChange={(e) => validateMath(e.target.value)}
                  className={`p-2 border rounded-md w-20 h-12 text-center text-lg font-medium focus:ring-2 focus:ring-[#334746] focus:border-transparent ${answerState === "correct" ? "border-green-500 bg-green-50" : answerState === "incorrect" ? "border-red-500 bg-red-50" : "border-gray-300"}`}
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#334746] text-white py-3 rounded-lg font-medium hover:bg-[#2a3a3a] disabled:bg-gray-400"
            >
              {isLoading ? "Sending..." : "Send code"}
            </button>
          </form>
        )}

        {step === "otp" && (
          <form onSubmit={handleVerifyOtp} className="space-y-5">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">
                Verify code
              </h1>
              <p className="text-gray-600 text-sm">
                Enter the 6-digit code sent to {email}.
              </p>
            </div>
            <div className="flex justify-center gap-3">
              {otp.map((d, i) => (
                <input
                  key={i}
                  value={d}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Backspace" && !otp[i] && i > 0) {
                      otpRefs.current[i - 1]?.focus();
                    }
                  }}
                  ref={(el) => {
                    otpRefs.current[i] = el;
                  }}
                  maxLength={1}
                  className="w-12 h-12 text-center text-xl font-semibold border-2 rounded-lg focus:outline-none focus:border-[#334746]"
                />
              ))}
            </div>
            <div className="flex items-center justify-between text-sm">
              <button
                type="button"
                className="text-[#334746] hover:underline"
                onClick={() => setStep("email")}
              >
                Use different email
              </button>
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#334746] text-white py-3 rounded-lg font-medium hover:bg-[#2a3a3a] disabled:bg-gray-400"
            >
              Continue
            </button>
          </form>
        )}

        {step === "reset" && (
          <form onSubmit={handleReset} className="space-y-5">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">
                Set new password
              </h1>
              <p className="text-gray-600 text-sm">
                Use a strong password with at least 8 characters.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New password
              </label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#334746] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirm new password
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#334746] focus:border-transparent"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#334746] text-white py-3 rounded-lg font-medium hover:bg-[#2a3a3a] disabled:bg-gray-400"
            >
              {isLoading ? "Updating..." : "Update password"}
            </button>
          </form>
        )}

        {step === "done" && (
          <div className="space-y-3 text-center">
            <h1 className="text-2xl font-bold text-gray-900">
              Password updated
            </h1>
            <p className="text-gray-600">Redirecting to login…</p>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default ForgotPasswordPage;
