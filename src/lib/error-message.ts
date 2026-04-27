export function getFriendlyErrorMessage(message?: string, fallback = "Please check the form and try again.") {
  if (!message) return fallback;

  try {
    const parsed = JSON.parse(message);
    if (Array.isArray(parsed) && parsed.length > 0) {
      const firstMessage = parsed.find((entry) => typeof entry?.message === "string")?.message;
      if (firstMessage) return firstMessage;
    }
  } catch {
    // Keep the original message when it is not JSON.
  }

  return message.length > 220 ? fallback : message;
}
