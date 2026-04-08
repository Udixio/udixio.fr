import { themeConfigStore, themeServiceStore } from "@/stores/themeConfigStore.ts";
import { useStore } from "@nanostores/react";
import { ThemeProvider as Theme } from "@udixio/ui-react";
import { argbFromHex, Hct } from "@material/material-color-utilities";
import { sourceColor } from "../../theme.config.ts";

export const updateThemeFromHex = (hex?: string) => {
  if (themeConfigStore.get().sourceColor === hex) return;

  if (hex) {
    const newHct = Hct.fromInt(argbFromHex(hex));
    themeConfigStore.set({
      ...themeConfigStore.get(),
      sourceColor: sourceColor(newHct.hue),
    });
  } else {
    themeConfigStore.set({
      ...themeConfigStore.get(),
      sourceColor: sourceColor(),
    });
  }
};

export const ThemeProvider = () => {
  const $themeConfig = useStore(themeConfigStore);

  return (
    <Theme
      throttleDelay={300}
      onLoad={(api) => {
        api.context.darkMode = $themeConfig.isDark ?? false;
        themeServiceStore.set(api);
        console.log("Theme loaded", api.context.sourceColor);
      }}
      config={$themeConfig}
    />
  );
};
