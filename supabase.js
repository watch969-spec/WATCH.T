// ============================================================
// WATCH.T — Supabase Configuration
// ============================================================
// ⚠️ REPLACE THESE with your actual values from:
// Supabase Dashboard → Settings → API
// ============================================================

export const SUPABASE_URL = "https://esqrstysdwttwkibdibc.supabase.co";
export const SUPABASE_ANON_KEY = "sb_publishable_8TjQScoHySIhLRQ_xRmhVQ_Ecotx6E9";

// ============================================================

import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

// Check if credentials are configured
export const supabaseConfigured =
  SUPABASE_URL.startsWith("https://") &&
  !SUPABASE_URL.includes("YOUR_PROJECT") &&
  !SUPABASE_URL.includes("your-project-ref") &&
  SUPABASE_ANON_KEY.length > 20 &&
  !SUPABASE_ANON_KEY.includes("YOUR_SUPABASE") &&
  !SUPABASE_ANON_KEY.includes("your_anon_key_here");

// Create client only if configured
export const supabase = supabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    })
  : null;

// ============================================================
// Helper Functions
// ============================================================

/**
 * Format number as Indian Rupees
 * @param {number} amount
 * @returns {string} e.g. "₹1,499"
 */
export function money(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(Number(amount) || 0);
}

/**
 * Escape HTML to prevent XSS
 * @param {string} value
 * @returns {string}
 */
export function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, ch => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[ch]));
}

// ============================================================
// Debug Helper
// ============================================================
if (!supabaseConfigured) {
  console.warn(
    "[WATCH.T] ⚠️ Supabase is NOT configured.\n" +
    "Please add your Project URL and anon key in supabase.js\n" +
    "Get them from: Supabase Dashboard → Settings → API"
  );
} else {
  console.log(
    "%c[WATCH.T] ✅ Supabase connected",
    "color: #2e7d32; font-weight: bold;",
    "\nURL:", SUPABASE_URL
  );
}