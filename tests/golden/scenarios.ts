import type { GoldenProfileId } from "./profiles";

export type GoldenLanguage = "Deutsch" | "Englisch";
export type GoldenLocale = "de-DE" | "en-US";

export interface GoldenScenario {
  readonly id: string;
  readonly title: string;
  readonly language: GoldenLanguage;
  readonly locale: GoldenLocale;
  readonly input: Readonly<Record<string, unknown>>;
  readonly maxLengthByProfile?: Readonly<
    Partial<Record<GoldenProfileId, number>>
  >;
}

const OPEN_VOILE_SHIRT_INPUT = {
  age: "21",
  height: "160 cm",
  bodyBuild: "Schlank & ausgewogen",
  chestProfile: "Sehr voll",
  chestShape: "Natürlich ausgewogen",
  lowerBody: "weich gerundete Hüftsilhouette",
  tshirt: "ein offen getragenes, luftiges Voile-Hemd mit feiner Webstruktur",
  tshirtColor: "Weiß",
  tshirtMaterialMode: "Manuell",
  tshirtMaterial: "Voile",
  bra: "kein BH sichtbar / nicht Teil des Outfits",
  sweater: "kein Pullover",
  jacket: "keine Jacke",
  outfitBuild: "Einzelne saubere Schicht",
  framingV5Id: "framing.upper_body",
  framing: "Brust-aufwärts-Porträt mit natürlichem Abstand",
  location: "Terrasse",
  locationArea: "Terrasse eines Stadthauses · ruhig und privat",
  expressionV5Id: "expression.laughing",
  expression: "natürlich lachend",
  lowerGarmentCategoryId: "lowerGarment.skirt",
  skirtModelId: "skirtModel.pleated",
  skirtLengthId: "skirtLength.short",
  skirtColor: "Dunkelblau",
} as const;

export const GOLDEN_SCENARIOS = [
  {
    id: "baseline.de",
    title: "Deutsche Baseline",
    language: "Deutsch",
    locale: "de-DE",
    input: {},
  },
  {
    id: "baseline.en",
    title: "English baseline",
    language: "Englisch",
    locale: "en-US",
    input: {},
  },
  {
    id: "character-sheet.compact.en",
    title: "English compact character sheet",
    language: "Englisch",
    locale: "en-US",
    input: {
      referenceMode: {
        enabled: true,
        mode: "referenceMode.character_sheet",
        sheetType: "referenceSheet.compact",
        layout: "referenceLayout.grid",
      },
    },
  },
  {
    id: "character-sheet.en",
    title: "English character sheet",
    language: "Englisch",
    locale: "en-US",
    input: {
      referenceMode: {
        enabled: true,
        mode: "referenceMode.character_sheet",
        sheetType: "referenceSheet.standard",
        layout: "referenceLayout.grid",
      },
    },
  },
  {
    id: "single-reference.de",
    title: "Deutsche Einzelreferenz",
    language: "Deutsch",
    locale: "de-DE",
    input: {
      referenceMode: {
        enabled: true,
        mode: "referenceMode.single_reference",
        purpose: "referencePurpose.identity",
        singleView: "referenceView.front",
      },
    },
    maxLengthByProfile: { standardJson: 14_000 },
  },
  {
    id: "single-reference.en",
    title: "English single reference",
    language: "Englisch",
    locale: "en-US",
    input: {
      referenceMode: {
        enabled: true,
        mode: "referenceMode.single_reference",
        purpose: "referencePurpose.identity",
        singleView: "referenceView.front",
      },
    },
    maxLengthByProfile: { standardJson: 14_000 },
  },
  {
    id: "selfie.front-enabled.en",
    title: "Binding front-camera selfie",
    language: "Englisch",
    locale: "en-US",
    input: {
      framingV5Id: "framing.upper_body",
      framing: "Brust-aufwärts-Porträt mit natürlichem Abstand",
      selfieMode: {
        enabled: true,
        type: "selfie.front",
        phoneVisibility: "selfiePhone.auto",
      },
    },
  },
  {
    id: "selfie.disabled.en",
    title: "Explicitly disabled selfie",
    language: "Englisch",
    locale: "en-US",
    input: {
      selfieMode: {
        enabled: false,
        type: "selfie.none",
        phoneVisibility: "selfiePhone.auto",
      },
    },
  },
  {
    id: "additional-person.en",
    title: "Second adult person",
    language: "Englisch",
    locale: "en-US",
    input: {
      additionalPerson: {
        enabled: true,
        type: "additionalPerson.randomWoman",
        position: "additionalPersonPosition.beside",
        activity: "additionalPersonActivity.standing",
      },
    },
  },
  {
    id: "garment.open.en",
    title: "Open upper garment",
    language: "Englisch",
    locale: "en-US",
    input: OPEN_VOILE_SHIRT_INPUT,
  },
  {
    id: "garment.closed.en",
    title: "Closed upper garment",
    language: "Englisch",
    locale: "en-US",
    input: {
      tshirt: "ein klassisches T-Shirt",
      tshirtMaterialMode: "Manuell",
      tshirtMaterial: "Baumwolle",
      bra: "kein BH sichtbar / nicht Teil des Outfits",
      sweater: "kein Pullover",
      jacket: "keine Jacke",
      outfitBuild: "Einzelne saubere Schicht",
    },
  },
  {
    id: "material-physics.de",
    title: "Deutsche adaptive Materialphysik",
    language: "Deutsch",
    locale: "de-DE",
    input: {
      tshirt: "eine offen getragene, leichte Organza-Bluse mit klarer Stoffstruktur",
      tshirtMaterialMode: "Manuell",
      tshirtMaterial: "Organza",
      materialEngine: {
        byGarment: {
          tshirt: {
            opacity: "materialOpacity.light_translucent",
            presentation: "materialPresentation.natural",
            realism: "materialRealism.premium",
            surface: "materialSurface.subtle_gloss",
          },
        },
      },
    },
    maxLengthByProfile: { standardJson: 14_000 },
  },
  {
    id: "material-physics.en",
    title: "English adaptive material physics",
    language: "Englisch",
    locale: "en-US",
    input: {
      pants: "eine weite Leinenhose",
      pantsMaterialMode: "Manuell",
      pantsMaterial: "Leinen",
      materialEngine: {
        byGarment: {
          pants: {
            opacity: "materialOpacity.opaque",
            presentation: "materialPresentation.clear",
            realism: "materialRealism.reference",
            surface: "materialSurface.matte",
          },
        },
      },
    },
  },
  {
    id: "adaptive-realism.de",
    title: "Deutscher Ultra-Realismus",
    language: "Deutsch",
    locale: "de-DE",
    input: { realismEngine: { level: "realism.ultra" } },
  },
  {
    id: "adaptive-realism.en",
    title: "English reference-grade realism",
    language: "Englisch",
    locale: "en-US",
    input: { realismEngine: { level: "realism.reference" } },
  },
  {
    id: "camera.full-body-85mm.de",
    title: "Aufgelöster Ganzkörper-85-mm-Konflikt",
    language: "Deutsch",
    locale: "de-DE",
    input: {
      framing: "Ganzkörper, Kopf bis Fuß, beide Füße sichtbar",
      framingV5Id: "framing.whole_person",
      lens: "85-mm-Porträtobjektiv",
    },
    maxLengthByProfile: { standardJson: 14_000 },
  },
  {
    id: "camera.smartphone-portrait.en",
    title: "English smartphone portrait camera",
    language: "Englisch",
    locale: "en-US",
    input: {
      framing: "Brust-aufwärts-Porträt mit natürlichem Abstand",
      framingV5Id: "framing.upper_body",
      device: "moderne Smartphone-Hauptkamera",
      deviceV5Id: "device.smartphone",
      lens: "26-mm-Smartphone-Hauptkameraäquivalent",
      lensV5Id: "lens.smart_main",
    },
  },
  {
    id: "lighting.weather-resolution.de",
    title: "Wetterabhängige Lichtauflösung",
    language: "Deutsch",
    locale: "de-DE",
    input: {
      location: "Strand",
      locationArea: "Bewölkter Strand · diffuse Atmosphäre",
      weatherMode: "Manuell",
      lightMode: "Erweitert",
      primaryLight: "Direkte Sonne",
      featureSelections: {
        weather: { condition: { enabled: true, intensity: "Bewölkt" } },
      },
    },
  },
  {
    id: "branding.named.de",
    title: "Deutsches sichtbares Oberteil-Branding",
    language: "Deutsch",
    locale: "de-DE",
    input: {
      tshirtBrand: "Tommy Hilfiger",
      brandVisibility: "Dezent sichtbar",
      brandPlacement: "Brustbereich / Vorderseite",
    },
    maxLengthByProfile: { standardJson: 14_000 },
  },
  {
    id: "branding.named.en",
    title: "English branded footwear",
    language: "Englisch",
    locale: "en-US",
    input: {
      shoesBrand: "Nike",
      shoesModel: "Air Force 1",
      brandVisibility: "Deutlich sichtbar",
      brandPlacement: "Schuhseite / Zunge",
    },
  },
  {
    id: "safety.adult-only.en",
    title: "Adult-only safety boundary",
    language: "Englisch",
    locale: "en-US",
    input: { age: "18", expression: "mit neutralem, ruhigem Ausdruck" },
  },
  {
    id: "quality-gate.release.de",
    title: "Freigegebene deutsche Ausführungsanweisung",
    language: "Deutsch",
    locale: "de-DE",
    input: { executionInstruction: true },
  },
  {
    id: "json.baseline.de",
    title: "Deutsche JSON-Baseline",
    language: "Deutsch",
    locale: "de-DE",
    input: { photoLook: "Klar, aber natürlich" },
    maxLengthByProfile: { standardJson: 14_000 },
  },
  {
    id: "json.v5611-special.en",
    title: "V500.6.11 compact JSON special case",
    language: "Englisch",
    locale: "en-US",
    input: {
      ...OPEN_VOILE_SHIRT_INPUT,
      executionInstruction: true,
      selfieMode: {
        enabled: true,
        type: "selfie.front",
        phoneVisibility: "selfiePhone.auto",
      },
      additionalPerson: {
        enabled: true,
        type: "additionalPerson.randomWoman",
        position: "additionalPersonPosition.beside",
        activity: "additionalPersonActivity.shared_selfie",
      },
    },
    maxLengthByProfile: { standardJson: 12_100 },
  },
] as const satisfies readonly GoldenScenario[];

export type GoldenScenarioId = (typeof GOLDEN_SCENARIOS)[number]["id"];
