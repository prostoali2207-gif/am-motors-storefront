/**
 * The origin the visitor used to reach the page, from the request headers, for the VDP URL in
 * WhatsApp prefills. No domain is configured yet (open question 15), so nothing is hard-coded.
 *
 * Only a plain host name (optionally with a port) is accepted; anything else → null and the
 * message is sent without a URL line on the server render. In the browser the link component
 * replaces it with `window.location.origin`, the page's actual origin.
 */
const HOST = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*(?::\d{1,5})?$/i;

export function siteOrigin(headers: Pick<Headers, "get">): string | null {
  const host = (headers.get("x-forwarded-host") ?? headers.get("host"))?.split(",")[0]?.trim() ?? "";
  if (!HOST.test(host)) return null;

  const forwarded = headers.get("x-forwarded-proto")?.split(",")[0]?.trim().toLowerCase();
  const local = /^(localhost|127\.0\.0\.1)(:\d+)?$/i.test(host);
  const protocol = forwarded === "http" || forwarded === "https" ? forwarded : local ? "http" : "https";
  return `${protocol}://${host.toLowerCase()}`;
}
