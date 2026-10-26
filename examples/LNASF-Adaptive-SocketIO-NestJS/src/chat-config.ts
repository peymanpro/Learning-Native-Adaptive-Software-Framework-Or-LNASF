const DEFAULT_ALLOWED_ORIGINS = ["http://localhost:3000"];

export function getAllowedOrigins(): string[] {
  const configured = process.env.CHAT_ALLOWED_ORIGINS ?? DEFAULT_ALLOWED_ORIGINS.join(",");
  const origins = configured.split(",").map((origin) => origin.trim()).filter(Boolean);
  return origins.length ? origins : DEFAULT_ALLOWED_ORIGINS;
}
