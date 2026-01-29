import {defineConfig} from "@udixio/ui-react";


export default defineConfig({
    sourceColor: '#527d6b',
    palettes: {
        // tertiary: "#D58A4E",
        success: "#4CAF50",
        warning: "#FFA726",
        info: "#2196F3"
    },
    fontFamily: {
        expressive: [
            'var(--font-just-sans)'
        ],
    },
    fontStyles: {
        display: {
            large: {
                fontWeight: 700,
                fontSize: 5,
                letterSpacing: -0.2,
            },
            medium: {
                fontSize: 4,
                fontWeight: 700,
            },
            small: {
                fontSize: 3,
                fontWeight: 700,
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
        warning: '#e5bb79',
        success: '#2ec038',
        default: '#a2afff',
        // purple: "#7852A9",
        // orange: '#F5704B'
    }
})
