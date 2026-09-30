import { vehicleMetadata, vehiclePage } from "@/app/_site/pages";

// No loading.tsx here on purpose: an unknown ID must return a real 404 status.
export const generateMetadata = vehicleMetadata("en");
export default vehiclePage("en");
