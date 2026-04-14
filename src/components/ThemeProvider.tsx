import { useState } from "react";
import { currentSourceHexStore, themeConfigStore, themeServiceStore } from "@/stores/themeConfigStore.ts";
import { useStore } from "@nanostores/react";
import { ThemeProvider as Theme } from "@udixio/ui-react";
import { argbFromHex, Hct } from "@material/material-color-utilities";
import { sourceColor } from "../../theme.config.ts";

export const updateThemeFromHex = (hex?: string | null) => {
  if (hex === undefined) return;

  if (hex === null) {
    themeConfigStore.set({
      ...themeConfigStore.get(),
      sourceColor: null,
    });
    currentSourceHexStore.set(undefined);
    return;
  }

  const newHct = Hct.fromInt(argbFromHex(hex));

  const currentHex = currentSourceHexStore.get();

  if (currentHex === hex) return;

  themeConfigStore.set({
    ...themeConfigStore.get(),
    sourceColor: sourceColor(newHct.hue),
  });
};

export const ThemeProvider = ({ initialCss }: { initialCss?: string }) => {
  const [showInitialCss, setShowInitialCss] = useState(!!initialCss);

  const $themeConfig = useStore(themeConfigStore);

  if ($themeConfig.sourceColor == null) return null;

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
