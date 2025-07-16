// Simple wrapper for canvas-confetti with CSP compatibility
export function showConfetti() {
  try {
    // Dynamically import canvas-confetti to avoid SSR issues
    import("canvas-confetti").then((confettiModule) => {
      const confetti = confettiModule.default;

      // Configure confetti with high z-index and CSP-compatible settings
      const confettiOptions = {
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        zIndex: 9999, // High z-index to appear in front
        disableForReducedMotion: true, // Accessibility consideration
        useWorker: false, // Disable worker to avoid CSP issues
      };

      // Fire confetti from the middle of the screen
      confetti(confettiOptions);

      // Fire another burst after a short delay
      setTimeout(() => {
        confetti({
          ...confettiOptions,
          particleCount: 50,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
        });
      }, 250);

      // Fire another burst from the opposite side
      setTimeout(() => {
        confetti({
          ...confettiOptions,
          particleCount: 50,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
        });
      }, 400);
    }).catch((error) => {
      console.warn("Failed to load canvas-confetti:", error);
      // Fallback: Show a simple success message
      console.log("🎉 Event created successfully! (Confetti disabled)");
    });
  } catch (error) {
    console.warn("Confetti function error:", error);
    // Fallback: Show a simple success message
    console.log("🎉 Event created successfully! (Confetti disabled)");
  }
}
