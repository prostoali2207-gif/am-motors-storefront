/**
 * A website conversion action (not the Ads account number) must supply both values.
 * Invalid/missing values disable the Google tag entirely. Only server code reads env.
 * The tag ID and label are public identifiers, never credentials.
 */
export interface GoogleAdsConfig {
  readonly tagId: string;
  readonly label: string;
}

export function parseGoogleAdsConfig(id: string | undefined, label: string | undefined): GoogleAdsConfig | null {
  if (id === undefined || label === undefined) return null;
  const tagId = id.trim();
  const targetLabel = label.trim();
  if (!/^AW-[0-9]{6,15}$/.test(tagId) || !/^[a-zA-Z0-9_-]{3,128}$/.test(targetLabel)) return null;
  return { tagId, label: targetLabel };
}

export function googleAdsConfig(): GoogleAdsConfig | null {
  return parseGoogleAdsConfig(process.env.GOOGLE_ADS_CONVERSION_ID, process.env.GOOGLE_ADS_CONVERSION_LABEL);
}
