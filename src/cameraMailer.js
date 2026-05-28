// Emails a photo taken in the phone Camera app to the portfolio owner via
// EmailJS. This mirrors src/paintMailer.js (same EmailJS account, service and
// template) but is photo-specific and, unlike sendDrawing(), it is awaited by
// the caller so the UI can show a "sent" / "failed" result. It still never
// throws — it resolves true on success and false on any error.
//
// Setup notes live in src/paintMailer.js. The template (template_sbjt977)
// already renders {{message}} and {{image}}, so it is reused as-is here.
//
// Until the keys below are filled in, sendPhoto() is a no-op that resolves false.

const EMAILJS_PUBLIC_KEY = "H6w6ptuQQMzVaEwVZ";
const EMAILJS_SERVICE_ID  = "service_evs8lsl";
const EMAILJS_TEMPLATE_ID = "template_sbjt977";

// Max template variable size on EmailJS free tier is ~50KB. We aim well under
// to leave headroom for the rest of the template body.
const MAX_DATA_URL_BYTES = 45000;
const MAX_DIMENSION = 600;
const QUALITY_LADDER = [0.7, 0.55, 0.4, 0.3, 0.2];

function keysConfigured() {
  return (
    !EMAILJS_PUBLIC_KEY.startsWith("YOUR_") &&
    !EMAILJS_SERVICE_ID.startsWith("YOUR_") &&
    !EMAILJS_TEMPLATE_ID.startsWith("YOUR_")
  );
}

async function compressForEmail(blob) {
  const bitmap = await createImageBitmap(blob);
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  // JPEG has no alpha, so paint a white background to avoid black fill.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(bitmap, 0, 0, w, h);
  if (bitmap.close) bitmap.close();

  for (const q of QUALITY_LADDER) {
    const dataUrl = canvas.toDataURL("image/jpeg", q);
    if (dataUrl.length <= MAX_DATA_URL_BYTES) return dataUrl;
  }
  // Last resort: minimum quality, accept whatever size results.
  return canvas.toDataURL("image/jpeg", 0.15);
}

// Returns a Promise<boolean>: true when the photo was accepted by EmailJS,
// false on misconfiguration, missing blob, or any network/encoding error.
export async function sendPhoto(blob) {
  if (!keysConfigured()) return false;
  if (!blob) return false;

  try {
    const dataUrl = await compressForEmail(blob);
    const res = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        service_id: EMAILJS_SERVICE_ID,
        template_id: EMAILJS_TEMPLATE_ID,
        user_id: EMAILJS_PUBLIC_KEY,
        template_params: {
          message: `A visitor sent you a photo from the camera app at ${new Date().toISOString()}.`,
          image: dataUrl,
        },
      }),
    });
    return res.ok;
  } catch (_) {
    return false;
  }
}
