import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { VehicleDetail } from "@/components/vehicle-detail";
import { VehicleGallery } from "@/components/vehicle-gallery";
import type { VehicleMedia } from "@/domain/vehicle-media";
import { syntheticAvailable, syntheticSold } from "../fixtures/vehicles";

afterEach(cleanup);

const MEDIA: VehicleMedia[] = [
  { id: "TESTMEDIA0000000000001", type: "image", src: "/media/TEST-0001/TESTMEDIA0000000000001/TESTREV00001" },
  { id: "TESTMEDIA0000000000002", type: "video" },
  { id: "TESTMEDIA0000000000003", type: "image", src: "/media/TEST-0001/TESTMEDIA0000000000003/TESTREV00003" },
];

describe("VehicleGallery", () => {
  it("shows a neutral 'Photos unavailable' state without any placeholder image", () => {
    const { container } = render(<VehicleGallery media={[]} title="Test title" />);
    expect(screen.getByText("Photos unavailable")).toBeDefined();
    expect(container.querySelector("img, video, picture")).toBeNull();
    expect(container.textContent).not.toMatch(/coming soon|soon|stock|placeholder/i);
  });

  it("treats video-only media as photos unavailable and never renders or autoloads video", () => {
    const { container } = render(<VehicleGallery media={[MEDIA[1]]} title="Test title" />);
    expect(screen.getByText("Photos unavailable")).toBeDefined();
    expect(container.querySelector("video, source, iframe")).toBeNull();
  });

  it("renders images only through the site's media route, in the given order", () => {
    const { container } = render(<VehicleGallery media={MEDIA} title="2001 Testmake Fixture Alpha" />);
    const images = screen.getAllByRole("img");
    expect(images.map((img) => img.getAttribute("alt"))).toEqual([
      "2001 Testmake Fixture Alpha, photo 1 of 2",
      "2001 Testmake Fixture Alpha, photo 2 of 2",
    ]);
    for (const img of images) {
      const urls = [img.getAttribute("src") ?? "", ...(img.getAttribute("srcset") ?? "").split(",")].join(" ");
      expect(urls).toMatch(/media%2FTEST-0001|\/media\/TEST-0001/);
      expect(urls).not.toMatch(/drive\.google|googleusercontent|googleapis/);
    }
    expect(images[0].getAttribute("loading")).toBe("eager");
    expect(images[1].getAttribute("loading")).toBe("lazy");
    expect(container.querySelector("video")).toBeNull();
    expect(container.textContent).not.toMatch(/cover|hero/i);
  });
});

describe("VehicleDetail media states", () => {
  it("shows 'Photos unavailable' on a VDP without media and keeps all facts", () => {
    render(<VehicleDetail vehicle={syntheticAvailable} />);
    expect(screen.getByRole("heading", { level: 2, name: "Photos" })).toBeDefined();
    expect(screen.getByText("Photos unavailable")).toBeDefined();
    expect(screen.getByText("AED 11,111")).toBeDefined();
  });

  it("shows photos on a sold VDP without making it look available", () => {
    render(<VehicleDetail vehicle={{ ...syntheticSold, media: MEDIA }} />);
    expect(screen.getAllByRole("img")).toHaveLength(2);
    expect(screen.getByText("This car has been sold.")).toBeDefined();
    expect(screen.queryByText(/AED/)).toBeNull();
  });
});
