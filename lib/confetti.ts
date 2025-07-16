import confetti from "canvas-confetti";

export const showConfetti = () => {
  try {
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = {
      startVelocity: 30,
      spread: 360,
      ticks: 60,
      zIndex: 9999, // High z-index to appear in front
      useWorker: false, // Disable worker to avoid CSP issues
      disableForReducedMotion: true, // Accessibility consideration
    };

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }

    const interval: any = setInterval(function () {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);

      try {
        // Try to create confetti with CSP-compatible settings
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
        });
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
        });
      } catch (error) {
        console.log("🎊 Could not load worker", error);
        clearInterval(interval);
        // Fallback: Just log success message
        console.log("🎉 Event created successfully! (Confetti blocked by CSP)");
      }
    }, 250);
  } catch (error) {
    console.log("🎊 Confetti initialization failed", error);
    console.log("🎉 Event created successfully! (Confetti disabled)");
  }
};
