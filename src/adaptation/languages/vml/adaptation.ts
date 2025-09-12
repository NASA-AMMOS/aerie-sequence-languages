import { PhoenixAdaptation } from "../../interfaces/adaptation.js";
import { getVmlLanguage } from "./language.js";

export const getVmlAdaptation: PhoenixAdaptation = {
  getLanguages(resources) {
    return {
      input: getVmlLanguage(resources),
      outputs: [],
    };
  },
};
