import { defineConfig } from "@udixio/ui-react";
import { Hct } from "@material/material-color-utilities";
import { Context } from "@udixio/theme";

export default defineConfig({
  sourceColor: ({ isDark }: Context) => Hct.from(161, 25, isDark ? 70 : 49),

  palettes: {
    // tertiary: "#D58A4E",

    tertiary: ({ sourceColor }) => ({
      hue: 185,
      chroma: sourceColor.chroma,
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
        fontWeight: 600,
        fontSize: 5,
        lineHeight: 5,
      },
      medium: {
        fontWeight: 600,
        fontSize: 4,
        lineHeight: 4,
      },
      small: {
        fontWeight: 600,
        fontSize: 3,
        lineHeight: 3,
      },
    },
    headline: {
      large: {
        fontWeight: 500,
      },
      medium: {
        fontWeight: 500,
      },
      small: {
        fontWeight: 500,
      },
    },
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
