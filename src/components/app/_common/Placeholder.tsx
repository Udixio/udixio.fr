import React, {useEffect} from "react";
import {appService} from "@/stores/appStore";

export default function Placeholder({ title, description }: { title: string; description?: string }) {
  useEffect(() => {
    appService.set({ actions: [] });
  }, []);
  return (
    <div className="p-4 space-y-2">
      <h1 className="text-xl font-semibold">{title}</h1>
      <p className="text-sm text-muted-foreground">{description || 'En construction. La structure de la page est en place, l’UI sera peaufinée ensuite.'}</p>
    </div>
  );
}
