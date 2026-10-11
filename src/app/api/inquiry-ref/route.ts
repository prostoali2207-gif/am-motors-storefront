import { createAccessTokenProvider } from "@/adapters/google-sheets/auth";
import { readInquiryLogConfig } from "@/inquiry-log/config";
import { handleInquiryRefRequest, type VehicleAvailability } from "@/inquiry-log/handle-request";
import { createRateLimiter } from "@/inquiry-log/rate-limit";
import { createSheetsHandoffWriter, SPREADSHEETS_SCOPE, type HandoffLogWriter } from "@/inquiry-log/sheets-writer";
import { getVehicle } from "@/inventory/queries";

/**
 * Inquiry reference log (issue #19, pending owner approval). 404 unless `INQUIRY_LOG` is
 * configured — see src/inquiry-log/config.ts and docs/inquiry-attribution.md.
 */

// Per instance: 10 handoffs per client and 300 in total per minute.
const rateLimiter = createRateLimiter({ perKey: 10, total: 300, windowMs: 60_000 });

let cachedWriter: { key: string; writer: HandoffLogWriter } | null = null;

async function vehicleAvailability(id: string): Promise<VehicleAvailability> {
  const result = await getVehicle(id);
  switch (result.kind) {
    case "ok":
      return result.vehicle.status === "available" ? "available" : "not-available";
    case "not-found":
      return "not-available";
    case "unavailable":
      return "unknown";
    default: {
      const unhandled: never = result;
      return unhandled;
    }
  }
}

export async function POST(request: Request): Promise<Response> {
  const config = readInquiryLogConfig();
  return handleInquiryRefRequest(request, {
    config,
    writer: () => {
      if (config.kind !== "google-sheets") throw new Error("inquiry log not configured");
      const key = `${config.spreadsheetId}|${config.auth.serviceAccountEmail}`;
      if (cachedWriter?.key !== key) {
        cachedWriter = {
          key,
          writer: createSheetsHandoffWriter({
            spreadsheetId: config.spreadsheetId,
            // Only the read-write Sheets scope, only for the separate log identity.
            getAccessToken: createAccessTokenProvider(config.auth, [SPREADSHEETS_SCOPE]),
          }),
        };
      }
      return cachedWriter.writer;
    },
    vehicleAvailability,
    rateLimiter,
    now: () => new Date(),
  });
}
