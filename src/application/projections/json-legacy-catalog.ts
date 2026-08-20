import type { JsonPromptLanguage } from "../../domain/contracts/prompt/json-projection";

interface LegacyCatalogEntry {
  readonly id: string;
  readonly de: string;
  readonly en: string;
}

const FRAMING = {
  "framing.whole_person": {
    id: "framing.ganzkorper_kopf_bis_fuss_beide_fusse_sichtbar.i2alww",
    de: "Ganzkörper, Kopf bis Fuß, beide Füße sichtbar",
    en: "full-body frame from head to toe with both feet visible",
  },
  "framing.upper_body": {
    id: "framing.brust_aufwarts_portrat_mit_naturlichem_abstand.aej8va",
    de: "Brust-aufwärts-Porträt mit natürlichem Abstand",
    en: "upper-body frame with a natural camera distance",
  },
  "upper-body frame with a natural camera distance": {
    id: "framing.brust_aufwarts_portrat_mit_naturlichem_abstand.aej8va",
    de: "Brust-aufwärts-Porträt mit natürlichem Abstand",
    en: "upper-body frame with a natural camera distance",
  },
} as const satisfies Readonly<Record<string, LegacyCatalogEntry>>;

const DEVICE = {
  "device.smartphone": {
    id: "device.modernes_smartphone_kamerasystem.1ddzwu2",
    de: "modernes Smartphone-Kamerasystem",
    en: "modern smartphone camera system",
  },
  "smartphone front camera": {
    id: "device.modernes_smartphone_kamerasystem.1ddzwu2",
    de: "modernes Smartphone-Kamerasystem",
    en: "modern smartphone camera system",
  },
} as const satisfies Readonly<Record<string, LegacyCatalogEntry>>;

const LENS = {
  "lens.smart_main": {
    id: "lens.hauptkamera_des_smartphones_mit_naturlicher_perspektive.bs04s8",
    de: "Hauptkamera des Smartphones mit natürlicher Perspektive",
    en: "smartphone main camera with a natural perspective",
  },
  "lens.portrait_85mm": {
    id: "lens.85_mm_portratobjektiv.1yzeikt",
    de: "Hauptkamera des Smartphones mit natürlicher Perspektive",
    en: "smartphone main camera with a natural perspective",
  },
} as const satisfies Readonly<Record<string, LegacyCatalogEntry>>;

const POSE = {
  "pose.standing": {
    id: "pose.frontal_und_aufrecht_stehend_gewicht_locker_auf_einem_bein.9pq962",
    de: "frontal und aufrecht stehend, Gewicht locker auf einem Bein",
    en: "standing upright with weight resting naturally on one leg",
  },
} as const satisfies Readonly<Record<string, LegacyCatalogEntry>>;

const LOCATION = {
  "location.apartment": { id: "location.wohnung.o9arnr", de: "Wohnung", en: "apartment" },
  Terrasse: { id: "location.terrasse.1w9zbs2", de: "Terrasse", en: "terrace" },
  Strand: { id: "location.strand.3efh1l", de: "Strand", en: "beach" },
} as const satisfies Readonly<Record<string, LegacyCatalogEntry>>;

const LOCATION_AREA = {
  "locationArea.apartment.modern_living_room_window": {
    id: "locationArea.wohnzimmer_modern_mit_naturlichem_fensterlicht.1lj5nkb",
    de: "Wohnzimmer · modern, mit natürlichem Fensterlicht",
    en: "modern living room with natural window light",
  },
  "Terrasse eines Stadthauses · ruhig und privat": {
    id: "locationArea.terrasse_eines_stadthauses_ruhig_und_privat.kcjzio",
    de: "Terrasse eines Stadthauses · ruhig und privat",
    en: "townhouse terrace that feels quiet and private",
  },
  "Bewölkter Strand · diffuse Atmosphäre": {
    id: "locationArea.bewolkter_strand_diffuse_atmosphare.3zz35",
    de: "Bewölkter Strand · diffuse Atmosphäre",
    en: "overcast beach with a diffuse atmosphere",
  },
} as const satisfies Readonly<Record<string, LegacyCatalogEntry>>;

export type JsonLegacyCatalogGroup = "framing" | "device" | "lens" | "pose" | "location" | "locationArea";

export function jsonLegacyCatalogEntry(group: JsonLegacyCatalogGroup, canonicalValue: string): LegacyCatalogEntry {
  const catalog: Readonly<Record<string, LegacyCatalogEntry>> = {
    framing: FRAMING,
    device: DEVICE,
    lens: LENS,
    pose: POSE,
    location: LOCATION,
    locationArea: LOCATION_AREA,
  }[group];
  const entry = catalog[canonicalValue];
  if (entry === undefined) throw new Error(`JSON_LEGACY_CATALOG_VALUE_UNSUPPORTED ${group} ${canonicalValue}`);
  return entry;
}

export function jsonLegacyLabel(entry: LegacyCatalogEntry, language: JsonPromptLanguage): string {
  return entry[language];
}

export const JSON_LEGACY_BRAND_GARMENT_IDS = Object.freeze({
  upper: "tshirt.ein_klassisches_t_shirt.yso72x",
  footwear: "shoes.weisse_klassische_sneaker.1od3aht",
});
