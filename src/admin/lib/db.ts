// Uploads a photo / video (stored in PostgreSQL, served at /uploads/…).
// Replaced or removed photos are cleaned up server-side once unused.
import { api } from "@/lib/session";

export async function uploadFile(file: File, prefix = "admin") {
  if (file.size > 10 * 1024 * 1024) throw new Error("Fichier trop lourd (maximum 10 Mo).");
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const form = new FormData();
  form.append("file", file);
  form.append("path", path);
  const res = await api<{ data: { path: string } }>("/api/upload", { method: "POST", body: form });
  return `/uploads/${res.data.path}`;
}
