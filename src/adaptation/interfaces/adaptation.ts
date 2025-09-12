import { InputLanguage, OutputLanguage } from "./language.js";
import { PhoenixResources } from "./phoenix.js";

export interface PhoenixLanguages {
  input: InputLanguage;
  outputs: OutputLanguage[];
}

export interface PhoenixAdaptation {
  getLanguages: (resources: PhoenixResources) => PhoenixLanguages;
}
