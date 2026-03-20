import { defineConfig } from "@udixio/ui-react";
import { getRotatedHue } from "@udixio/theme";

export default defineConfig({
  sourceColor: "#478d6e",
  palettes: {
    // tertiary: "#D58A4E",
    tertiary: ({ sourceColor }) => ({
      hue: getRotatedHue(
        sourceColor,
        [0, 20, 71, 161, 333, 360],
        [-40, 48, -32, 40, -32],
      ),
      chroma: sourceColor.chroma * 0.75,
    }),
    success: "#4CAF50",
    warning: "#FFA726",
    info: "#2196F3",
  },
  fontFamily: {
    expressive: ["var(--font-clash-grotesk)"],
    neutral: ["var(--font-inter)"],
  },
  fontStyles: {
    display: {
      large: {
        fontWeight: 500,
        fontSize: 5,
        lineHeight: 5,
      },
      medium: {
        fontSize: 4,
        fontWeight: 4,
      },
      small: {
        fontSize: 3,
        fontWeight: 3,
      },
    },
    // headline: {
    //     large: {
    //         fontWeight: 600,
    //     },
    //     medium: {
    //         fontWeight: 600,
    //     },
    //     small: {
    //         fontWeight: 600,
    //     },
    // },
    // title: {
    //     large: {
    //         fontWeight: 500,
    //     },
    //     medium: {
    //         fontWeight: 500,
    //     },
    //     small: {
    //         fontWeight: 500,
    //     },
    // },
  },
  responsiveBreakPoints: {
    lg: 1.2,
    xl: 1.4,
  },
  subThemes: {
    warning: "#e5bb79",
    success: "#2ec038",
    default: "#a2afff",
    // purple: "#7852A9",
    // orange: '#F5704B'
  },
});
