import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;

// Only instantiate Resend if API key is available
// This prevents build failures when the key is not set
export const resend = apiKey ? new Resend(apiKey) : null;

export function isResendConfigured(): boolean {
  return resend !== null;
}
