import { preload } from "react-dom";
import { HomePage } from "@/components/home-page";

export default function Home() {
  preload("/portfoliohero-poster.avif", {
    as: "image",
    type: "image/avif",
    fetchPriority: "high",
  });

  return <HomePage />;
}
