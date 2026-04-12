import { useEffect, useState } from "react";
import { currentSourceHexStore, themeConfigStore, themeServiceStore } from "@/stores/themeConfigStore.ts";
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

export const ThemeProvider = ({ initialCss }: { initialCss?: string }) => {
  const [showInitialCss, setShowInitialCss] = useState(!!initialCss);

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
