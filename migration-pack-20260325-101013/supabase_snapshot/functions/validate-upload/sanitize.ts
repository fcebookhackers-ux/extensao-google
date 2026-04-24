const SAFE_FILENAME_REGEX = /[^a-zA-Z0-9._-]/g;

export function sanitizeFileName(filename: string): string {
  // Remove path components and dangerous sequences
  let safe = filename
    .replace(/\\/g, "/") // Windows separators
    .split("/")
    .pop() || "file";

  // Remove control characters and null bytes
  safe = safe.replace(/[\u0000-\u001f\u007f]/g, "");

  // Remove relative path attempts
  safe = safe.replace(/\.\.+/g, ".");
  safe = safe.replace(/(^\.|^\/+)/g, "");

  // Whitelist characters
  safe = safe.replace(SAFE_FILENAME_REGEX, "-");

  // Ensure not empty
  if (!safe) safe = "file";

  // Limit length to 255 characters (common FS limit)
  if (safe.length > 255) {
    const extIndex = safe.lastIndexOf(".");
    if (extIndex > 0 && extIndex < 255) {
      const base = safe.slice(0, Math.min(extIndex, 240));
      const ext = safe.slice(extIndex);
      safe = `${base}${ext}`.slice(0, 255);
    } else {
      safe = safe.slice(0, 255);
    }
  }

  return safe;
}
