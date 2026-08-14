// Feature flags — one place to turn things on and off.

// Sign-in works end to end, but the emails that carry the code need an SMTP
// provider configured in Supabase. Until that exists, offering sign-in sends
// students into a dead end: they ask for a code that never arrives. Flip this
// to true once Resend (or any SMTP) is wired up, and the whole flow returns.
export const SIGN_IN_ENABLED = false;
