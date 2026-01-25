import {defineConfig} from "@udixio/ui-react";


export default defineConfig({
    sourceColor: '#a2afff',
    palettes: {
        success: "#4CAF50",
        warning: "#FFA726",
        info: "#2196F3"
    },
    fontStyles: {
        // display: {
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
        // body: {
        //     large: {
        //         fontSize: 1.25,
        //         lineHeight: 1.5625,
        //     },
        //     medium: {
        //         fontSize: 1,
        //         lineHeight: 1.25,
        //     },
        //     small: {
        //         fontSize: 0.75,
        //         lineHeight: 1,
        //     },
        // },

    },
    responsiveBreakPoints: {
        lg: 1.125,
        xl: 1.25,
    },
    subThemes: {
        warning: '#e5bb79',
        success: '#2ec038',
        default: '#a2afff',
        // purple: "#7852A9",
        // orange: '#F5704B'
    }
})
