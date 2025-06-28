// Simple wrapper for canvas-confetti
export function showConfetti() {
  // Dynamically import canvas-confetti to avoid SSR issues
  import("canvas-confetti").then((confettiModule) => {
    const confetti = confettiModule.default;

    // Fire confetti from the middle of the screen
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
    });

    // Fire another burst after a short delay
    setTimeout(() => {
      confetti({
        particleCount: 50,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
      });
    }, 250);

    // Fire another burst from the opposite side
    setTimeout(() => {
      confetti({
        particleCount: 50,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
      });
    }, 400);
  });
}
