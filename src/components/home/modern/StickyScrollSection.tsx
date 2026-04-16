import React from "react";
import { StickyScroll } from "@/components/sticky-scroll-reveal";
import { stickyScrollItemsAstro } from "./StickyScrollContent";

export const StickyScrollSection = () => {
  return <StickyScroll items={stickyScrollItemsAstro} />;
};
