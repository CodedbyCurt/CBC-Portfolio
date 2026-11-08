import { ImageResponse } from "next/og";
import { siteConfig } from "@/lib/site-config";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div style={{ background: "#f4f0e8", color: "#171714", display: "flex", flexDirection: "column", height: "100%", justifyContent: "space-between", padding: "64px", width: "100%" }}>
      <div style={{ display: "flex", fontSize: 31, fontWeight: 800, letterSpacing: -2 }}>{siteConfig.businessName.toUpperCase()}</div>
      <div style={{ display: "flex", flexDirection: "column", fontSize: 108, fontWeight: 900, letterSpacing: -9, lineHeight: 0.83 }}>
        <span>LOOK THE PART.</span><span style={{ color: "#f05a28" }}>BE EASY TO CHOOSE.</span>
      </div>
      <div style={{ display: "flex", borderTop: "3px solid #171714", fontSize: 22, justifyContent: "space-between", paddingTop: "24px" }}><span>Websites for UK tradespeople</span><span>Clear. Professional. Yours.</span></div>
    </div>,
    size,
  );
}
