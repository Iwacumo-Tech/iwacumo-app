// revelation-main/src/lib/error-handler.ts
export const formatErrorMessage = (error: any): string => {
  const message = error?.message || "";
  
  if (message.includes("Unique constraint")) {
    return "An account with this email or username already exists.";
  }
  if (message.includes("Unauthorized") || error?.code === "UNAUTHORIZED") {
    return "Please log in to perform this action.";
  }
  if (message.includes("Record to delete does not exist")) {
    return "This item has already been removed.";
  }
  
  return "Something went wrong. Please try again.";
};