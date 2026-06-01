/**
 * Canonical public site URL — used for guest-facing links (QR codes, menu
 * URLs) so they always point to the live domain, regardless of where the
 * admin panel is opened (localhost, vercel.app, etc.).
 *
 * Override via NEXT_PUBLIC_SITE_URL if the domain changes.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://tap-menu.ru"
).replace(/\/+$/, "");
