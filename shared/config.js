// Live Supabase connection for the Vitra app + admin.
// The anon key is safe to ship in a client app — Row Level Security protects your data.
// (The service-role key is NOT here; it stays a server-side secret.)
export const VITRA_ENV = {
  SUPABASE_URL: 'https://hvxvxgiqxctcasyguoxh.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2eHZ4Z2lxeGN0Y2FzeWd1b3hoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI2NTEyMTMsImV4cCI6MjA5ODIyNzIxM30.nxgHD_VRiPzlXiO9ZCZYrrAHeLGdZn2vBoqjwXkqrng',
};
