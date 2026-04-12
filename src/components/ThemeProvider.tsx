import { useState } from "react";
import { themeConfigStore, themeServiceStore, currentSourceHexStore } from "@/stores/themeConfigStore.ts";
import { useStore } from "@nanostores/react";
import { ThemeProvider as Theme } from "@udixio/ui-react";
import { argbFromHex, Hct } from "@material/material-color-utilities";
import { sourceColor } from "../../theme.config.ts";

export const updateThemeFromHex = (hex?: string) => {
  const currentHex = currentSourceHexStore.get();
  if (currentHex === hex) return;

  if (hex) {
    const newHct = Hct.fromInt(argbFromHex(hex));
    currentSourceHexStore.set(hex);
    themeConfigStore.set({
      ...themeConfigStore.get(),
      sourceColor: sourceColor(newHct.hue),
    });
  } else {
    currentSourceHexStore.set(undefined);
    themeConfigStore.set({
      ...themeConfigStore.get(),
      sourceColor: sourceColor(),
    });
  }
};

export const ThemeProvider = ({
  initialCss,
  defaultSourceColor,
}: {
  initialCss?: string;
  defaultSourceColor?: string;
}) => {
  const [showInitialCss, setShowInitialCss] = useState(!!initialCss);

  // Initialise le hex courant depuis le SSR pour éviter un recalcul inutile
  if (defaultSourceColor && currentSourceHexStore.get() === undefined) {
    currentSourceHexStore.set(defaultSourceColor);
  }

  const $themeConfig = useStore(themeConfigStore);

  return (
    <>
      {showInitialCss && (
        <style
          id="udixio-theme-ssr"
          dangerouslySetInnerHTML={{ __html: initialCss! }}
        />
      )}
      <Theme
        onLoad={(api) => {
          setShowInitialCss(false);
          api.context.darkMode = $themeConfig.isDark ?? false;
          themeServiceStore.set(api);
        }}
        config={$themeConfig}
      />
    </>
  );
};
