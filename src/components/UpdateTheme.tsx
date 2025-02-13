import {useEffect, useState} from "react";
import {bootstrapFromConfig, VariantModel} from "@udixio/theme";
import {DislikeAnalyzer, sanitizeDegreesDouble, TonalPalette} from "@material/material-color-utilities";

export const UpdateTheme = (args: {
    theme: {
        isDark: boolean, source: string,
    } | null
}) => {

    const [theme, setTheme] = useState<{ isDark: boolean, source: string } | null>(null)
    const [{colorService, themeService}] = useState(
        bootstrapFromConfig({
            config: {
                sourceColor: '#ee1838',
                variant: {
                    ...VariantModel.tonalSpot,
                    palettes: {
                        ...VariantModel.tonalSpot.palettes,
                        secondary: (sourceColorHct) =>
                            TonalPalette.fromHueAndChroma(sourceColorHct.hue, 24.0),
                        tertiary: (sourceColorHct) =>
                            TonalPalette.fromHueAndChroma(
                                sanitizeDegreesDouble(sourceColorHct.hue + 45.0),
                                24.0
                            ),
                    }
                },
                colors: {
                    colors: {
                        tertiaryContainer: {
                            tone: (s) => {
                                const proposedHct = s
                                    .getPalette('tertiary')
                                    .getHct((s.isDark ? 30 : 93),);
                                return DislikeAnalyzer.fixIfDisliked(proposedHct).tone;
                            },
                        },
                    },
                },
            },
        }),
    );

    const updateTheme = (isDark: boolean, source: string) => {
        themeService.update({isDark: isDark});
        themeService.update({sourceColorHex: source});
        for (const [key, value] of colorService.getColors().entries()) {
            const newKey = key.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
            const {r, g, b} = value.getRgb()
            document.documentElement.style.setProperty('--colors-' + newKey, `${r} ${g} ${b}`);
        }
    }
    const resetTheme = () => {
        for (const [key] of colorService.getColors().entries()) {
            const newKey = key.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
            document.documentElement.style.removeProperty('--colors-' + newKey);
        }
    }

    useEffect(() => {
        if (theme) {
            updateTheme(theme.isDark, theme.source)
        }
    }, [theme]);

    useEffect(() => {
        if (args !== null && args.theme?.source !== theme?.source) {
            setTheme(args.theme)
        } else {
            resetTheme()
        }
    }, [args]);

    return <></>
}