import { useEffect, useState } from "react";
import { loadSettings, subscribeToSettings } from "./appSettings";

export function useOutputEngine() {
  const [engine, setEngine] = useState(() => loadSettings().outputEngine);
  useEffect(() => subscribeToSettings((settings) => setEngine(settings.outputEngine)), []);
  return engine;
}
