// Fire-and-forget helper that emails Paint drawings to the portfolio owner via
// EmailJS. The local save in Paint.vue is independent — this function never
// blocks, never throws to the caller, and silently no-ops when the keys below
// are still placeholders.
//
// One-time setup (you, the portfolio owner):
//   1. Sign up at https://www.emailjs.com (free, 200 emails / month).
//   2. Dashboard -> Email Services -> connect a Gmail (or other) provider.
//   3. Dashboard -> Email Templates -> create a template. In its HTML content,
//      reference these variables exactly once each:
//        - {{message}}  -> short text body
//        - {{image}}    -> use inside an <img> tag, e.g.
//                          <img src="{{image}}" style="max-width:100%" />
//   4. Copy the public key (Account -> General), the service ID, and the
//      template ID into the three constants below.
//   5. (Recommended) Dashboard -> Account -> Security -> add your portfolio
//      domain to the allowed origins so the key can't be reused elsewhere.
//
// Until those keys are filled in, sendDrawing() is a no-op.

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

export function sendDrawing(blob) {
  if (!keysConfigured()) return;
  if (!blob) return;

  // Detach from caller — we do not await this anywhere.
  (async () => {
    try {
      const dataUrl = await compressForEmail(blob);
      await fetch("https://api.emailjs.com/api/v1.0/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service_id: EMAILJS_SERVICE_ID,
          template_id: EMAILJS_TEMPLATE_ID,
          user_id: EMAILJS_PUBLIC_KEY,
          template_params: {
            message: `A visitor saved a new Paint drawing at ${new Date().toISOString()}.`,
            image: dataUrl,
          },
        }),
      });
    } catch (_) {
      // Silent: never break the user's local save flow.
    }
  })();
}
