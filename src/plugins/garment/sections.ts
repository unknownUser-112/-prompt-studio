import type { PromptSectionProvider } from "../../contracts/plugins/plugin-registrar";
import { createResolvedFragmentDraft, createResolvedSectionDraft } from "../../contracts/plugins/create-resolved-section-draft";

const BASELINE_DE = "OUTFIT & ACCESSOIRES\nSie trägt ein klassisches T-Shirt in Weiß, eine High-Waist-Jeans in Denimblau und weiße klassische Sneaker. Das Outfit besteht aus einer einzelnen, sauber wirkenden Schicht. Oberteil besteht aus baumwolle; sichtbare Maschenstruktur, weicher Fall und natürliche Dehnung, fällt ruhig und folgt Körperhaltung und Schwerkraft und schulter-, Brust-, Taillen- und Saumbereich zeigen materialgerechte Spannung statt aufgemalter Stoffoberfläche. Hose besteht aus denim; feste Denim-Webung, stabile Zugfalten und glaubwürdige Nähte, fällt ruhig und folgt Körperhaltung und Schwerkraft und bund, Knie- und Hüftbereich zeigen belastungsabhängige Zug-, Kompressions- und Sitzfalten. Schuhe besteht aus leder-Textil-Mischung; materialgerechte Stärke, Falten an den Gelenken und zurückhaltende Reflexionen, fällt ruhig und folgt Körperhaltung und Schwerkraft und sohle, Obermaterial und Fußstellung folgen dem Bodenkontakt; keine schwebenden oder verformten Schuhe.";
const BASELINE_EN = "OUTFIT AND ACCESSORIES\nShe wears a classic T-shirt in white, high-waisted jeans in denim blue, and classic white sneakers. The outfit uses cotton, denim, and leather-textile blend. Fabric tension, folds, seams, reflections, and material thickness respond naturally to posture, movement, gravity, and wind. Fabric folds originate from gravity, body contact points, garment construction, and movement; avoid decorative, mirrored, or repetitive wrinkle patterns.";
const MATERIAL_CONSISTENCY_DE = "Materialreflexionen, Falten, Nähte und Materialdicke folgen der Körperhaltung und der Schwerkraft.";
const MATERIAL_CONSISTENCY_EN = "Fabric tension, folds, seams, reflections, and material thickness respond naturally to posture, movement, gravity, and wind.";

export const garmentSection: PromptSectionProvider = {
  id: "garment",
  provide: (state) => {
    const german = state.facts.values.promptLanguage === "Deutsch";
    if (isOpenVoileShirt(state.values)) return [createOpenVoileDraft(state, german)];
    const wideLegLinen = isWideLegLinenTrousers(state.values);
    const branding = resolvedBranding(state.values);
    const upperBrand = branding?.allowedGarment === "upper" ? branding : undefined;
    const footwearBrand = branding?.allowedGarment === "footwear" ? branding : undefined;
    const smoothLeather = readNestedItem(state.values, "footwear", "material") === "material.smooth_leather";
    const outfit = german
      ? upperBrand === undefined
        ? "Sie trägt ein klassisches T-Shirt in Weiß, eine High-Waist-Jeans in Denimblau und weiße klassische Sneaker."
        : `Sie trägt ein klassisches T-Shirt in Weiß von ${upperBrand.name}, eine High-Waist-Jeans in Denimblau und weiße klassische Sneaker.`
      : wideLegLinen
        ? "She wears a classic T-shirt in white, wide-leg linen trousers in denim blue, and classic white sneakers."
        : footwearBrand === undefined
          ? "She wears a classic T-shirt in white, high-waisted jeans in denim blue, and classic white sneakers."
          : `She wears a classic T-shirt in white, high-waisted jeans in denim blue, and classic white sneakers by ${footwearBrand.name}${footwearBrand.model === undefined ? "" : ` model ${footwearBrand.model}`}.`;
    const materialBehaviour = german
      ? "Oberteil besteht aus baumwolle; sichtbare Maschenstruktur, weicher Fall und natürliche Dehnung, fällt ruhig und folgt Körperhaltung und Schwerkraft und schulter-, Brust-, Taillen- und Saumbereich zeigen materialgerechte Spannung statt aufgemalter Stoffoberfläche. Hose besteht aus denim; feste Denim-Webung, stabile Zugfalten und glaubwürdige Nähte, fällt ruhig und folgt Körperhaltung und Schwerkraft und bund, Knie- und Hüftbereich zeigen belastungsabhängige Zug-, Kompressions- und Sitzfalten. Schuhe besteht aus leder-Textil-Mischung; materialgerechte Stärke, Falten an den Gelenken und zurückhaltende Reflexionen, fällt ruhig und folgt Körperhaltung und Schwerkraft und sohle, Obermaterial und Fußstellung folgen dem Bodenkontakt; keine schwebenden oder verformten Schuhe."
      : wideLegLinen
        ? "The outfit uses cotton, linen, and leather-textile blend. Fabric tension, folds, seams, reflections, and material thickness respond naturally to posture, movement, gravity, and wind. Fabric folds originate from gravity, body contact points, garment construction, and movement; avoid decorative, mirrored, or repetitive wrinkle patterns."
        : smoothLeather
          ? "The outfit uses cotton, denim, and smooth leather. Fabric tension, folds, seams, reflections, and material thickness respond naturally to posture, movement, gravity, and wind. Fabric folds originate from gravity, body contact points, garment construction, and movement; avoid decorative, mirrored, or repetitive wrinkle patterns."
          : "The outfit uses cotton, denim, and leather-textile blend. Fabric tension, folds, seams, reflections, and material thickness respond naturally to posture, movement, gravity, and wind. Fabric folds originate from gravity, body contact points, garment construction, and movement; avoid decorative, mirrored, or repetitive wrinkle patterns.";
    const outfitPaths = [
      "garment.footwear.color",
      "garment.footwear.kind",
      "garment.lower.color",
      "garment.lower.kind",
      ...(wideLegLinen ? ["garment.lower.material"] : []),
      "garment.upper.color",
      "garment.upper.kind",
      ...(branding === undefined ? [] : ["brand.allowedGarment", "brand.name"]),
      ...(footwearBrand?.model === undefined ? [] : ["brand.model"]),
    ];
    const materialPaths = [
      "garment.footwear.color",
      "garment.footwear.kind",
      "garment.lower.color",
      "garment.lower.kind",
      ...(wideLegLinen ? ["garment.lower.material"] : []),
      ...(smoothLeather ? ["garment.footwear.material"] : []),
      "garment.upper.color",
      "garment.upper.kind",
    ];
    const outfitFragment = createResolvedFragmentDraft(
      state,
      "garment",
      "garment.outfit",
      outfit,
      outfitPaths,
    );
    const materialFragment = createResolvedFragmentDraft(
      state,
      "garment",
      "garment.material-behaviour",
      materialBehaviour,
      materialPaths,
    );
    const materialConsistencyFragment = createMaterialConsistencyFragment(state, german);
    const fragments = german ? [
      outfitFragment,
      createResolvedFragmentDraft(state, "garment", "garment.outfit-build", "Das Outfit besteht aus einer einzelnen, sauber wirkenden Schicht.", ["garment.outfitBuild"]),
      materialFragment,
      ...(materialConsistencyFragment === undefined ? [] : [materialConsistencyFragment]),
    ] : [
      outfitFragment,
      materialFragment,
      ...(materialConsistencyFragment === undefined ? [] : [materialConsistencyFragment]),
    ];
    const sectionText = german && upperBrand !== undefined
      ? `OUTFIT & ACCESSOIRES\n${outfit} Das Outfit besteht aus einer einzelnen, sauber wirkenden Schicht. ${materialBehaviour}`
      : !german && (wideLegLinen || footwearBrand !== undefined)
      ? `OUTFIT AND ACCESSORIES\n${outfit} ${materialBehaviour}`
      : german ? BASELINE_DE : BASELINE_EN;
    return [createResolvedSectionDraft(state, "garment", `${sectionText}\n`, fragments)];
  },
};

type ResolvedBranding = {
  readonly allowedGarment: string;
  readonly model?: string;
  readonly name: string;
};

function resolvedBranding(values: unknown): ResolvedBranding | undefined {
  const brand = objectAt(values, "brand");
  if (typeof brand?.allowedGarment !== "string" || typeof brand.name !== "string") return undefined;
  return {
    allowedGarment: brand.allowedGarment,
    name: brand.name,
    ...(typeof brand.model === "string" ? { model: brand.model } : {}),
  };
}

function createOpenVoileDraft(state: Parameters<PromptSectionProvider["provide"]>[0], german: boolean) {
  const upperBody = german
    ? "Das ausgewählte Kleidungsstück, ein offen getragenes, luftiges Voile-Hemd mit feiner Webstruktur in Weiß, ist das einzige Oberkörperkleidungsstück der Hauptperson."
    : "The selected garment, an airy voile shirt worn open with a fine woven texture in white, is the primary subject's only upper-body garment.";
  const layering = german
    ? "Es wird kein separates Oberkörperkleidungsstück darunter oder darüber getragen: kein T-Shirt, kein Tanktop, kein Camisole, kein Crop-Top, kein Body, kein Unterhemd, keine Basisschicht, kein Bralette, kein BH oder BH-Top, kein Pullover oder Cardigan und kein anderes zusätzliches Oberteil. Interpretiere den offenen Stil oder das leicht transparente Material nicht als Erlaubnis, eine Bedeckungsschicht zu erfinden. Bewahre die exakte Öffnung, das Material, die Farbe, die Passform und die Silhouette des ausgewählten Kleidungsstücks."
    : "No separate upper-body garment is worn beneath or over it: no T-shirt, no tank top, no camisole, no crop top, no bodysuit, no undershirt, no base layer, no bralette, no bra or bra top, no sweater or cardigan or any other additional top. Do not interpret the open styling or lightly translucent material as permission to invent a coverage layer. Preserve the selected garment's exact opening, material, color, fit, and silhouette.";
  const garmentState = german
    ? "Das ausgewählte Oberkörperkleidungsstück wird sichtbar offen getragen. Die ausgewählte vordere Knopfleiste bleibt im gesamten sichtbaren Oberkörperbereich sichtbar ungeknöpft. Kein sichtbarer Knopf verbindet die beiden Vorderteile. Die beiden Vorderteile bleiben entlang der sichtbaren Körpermitte getrennt und fallen entsprechend Material, Haltung und Schwerkraft natürlich. Das Kleidungsstück darf nicht zugeknöpft, geschlossen, überlappend geschlossen oder als geschlossenes Hemd beziehungsweise geschlossene Bluse umgedeutet werden. Bewahre Öffnung, Material, Farbe, Passform und Silhouette exakt. Füge keine nicht ausgewählte Oberkörperschicht hinzu."
    : "The selected upper-body garment is visibly worn open. The selected front button placket remains visibly undone throughout the visible torso area. No visible button connects the two front panels. The two front panels remain separated along the visible center of the torso and drape naturally according to the material, posture, and gravity. Do not button, fasten, overlap closed, or reinterpret the garment as a closed shirt or blouse. Preserve the selected opening, material, color, fit, and silhouette. Do not add an unselected upper-body layer.";
  const outfit = german
    ? "Sie trägt ein offen getragenes, luftiges Voile-Hemd mit feiner Webstruktur in Weiß und weiße klassische Sneaker."
    : "She wears an airy voile shirt worn open with a fine woven texture in white and classic white sneakers.";
  const materialBehaviour = german
    ? "Das Outfit verwendet Voile und eine Leder-Textil-Mischung. Stoffspannung, Falten, Nähte, Reflexionen und Materialstärke reagieren natürlich auf Haltung, Bewegung, Schwerkraft und Wind. Stofffalten entstehen durch Schwerkraft, Körperkontaktpunkte, Kleidungsaufbau und Bewegung; vermeide dekorative, gespiegelte oder sich wiederholende Faltenmuster."
    : "The outfit uses Voile and leather-textile blend. Fabric tension, folds, seams, reflections, and material thickness respond naturally to posture, movement, gravity, and wind. Fabric folds originate from gravity, body contact points, garment construction, and movement; avoid decorative, mirrored, or repetitive wrinkle patterns.";
  const materialConsistencyFragment = createMaterialConsistencyFragment(state, german);
  const fragments = [
    createResolvedFragmentDraft(state, "garment", "garment.upper-body", upperBody, ["garment.upper.color", "garment.upper.kind", "garment.upper.material"]),
    createResolvedFragmentDraft(state, "garment", "garment.layering", layering, ["garment.open", "garment.upper.color", "garment.upper.kind", "garment.upper.material", "garment.upperLayer"]),
    createResolvedFragmentDraft(state, "garment", "garment.state", garmentState, ["garment.open", "garment.upper.color", "garment.upper.kind", "garment.upper.material", "garment.upperLayer"]),
    createResolvedFragmentDraft(state, "garment", "garment.outfit", outfit, ["garment.footwear.color", "garment.footwear.kind", "garment.upper.color", "garment.upper.kind", "garment.upper.material"]),
    createResolvedFragmentDraft(state, "garment", "garment.material-behaviour", materialBehaviour, ["garment.footwear.kind", "garment.upper.kind", "garment.upper.material"]),
    ...(materialConsistencyFragment === undefined ? [] : [materialConsistencyFragment]),
  ];
  return createResolvedSectionDraft(
    state,
    "garment",
    `${german ? "OUTFIT & ACCESSOIRES" : "OUTFIT AND ACCESSORIES"}\n${outfit} ${materialBehaviour}\n`,
    fragments,
  );
}

function createMaterialConsistencyFragment(
  state: Parameters<PromptSectionProvider["provide"]>[0],
  german: boolean,
) {
  const material = objectAt(state.values, "material");
  const activeSlots = material?.activeSlots;
  if (!Array.isArray(activeSlots) || activeSlots.length === 0 || !activeSlots.every(isMaterialSlot)) return undefined;
  const paths = ["material.activeSlots", ...activeSlots.map((slot) => `material.${slot}`)];
  if (!paths.every((path) => state.trace.entries.some((entry) => entry.path === path))) return undefined;
  return createResolvedFragmentDraft(
    state,
    "garment",
    "garment.material-consistency",
    german ? MATERIAL_CONSISTENCY_DE : MATERIAL_CONSISTENCY_EN,
    paths,
  );
}

function isMaterialSlot(value: unknown): value is "footwear" | "lower" | "upper" {
  return value === "footwear" || value === "lower" || value === "upper";
}

function objectAt(value: unknown, key: string): Readonly<Record<string, unknown>> | undefined {
  if (value === null || Array.isArray(value) || typeof value !== "object") return undefined;
  const child = (value as Readonly<Record<string, unknown>>)[key];
  return child !== null && !Array.isArray(child) && typeof child === "object"
    ? child as Readonly<Record<string, unknown>>
    : undefined;
}

function isOpenVoileShirt(values: unknown): boolean {
  return readNested(values, "garment", "open") === true
    && readNested(values, "garment", "upperLayer") === "none"
    && readNestedItem(values, "upper", "kind") === "upperGarment.shirt"
    && readNestedItem(values, "upper", "color") === "color.white"
    && readNestedItem(values, "upper", "material") === "Voile";
}

function isWideLegLinenTrousers(values: unknown): boolean {
  return readNestedItem(values, "lower", "kind") === "lowerGarment.wide_leg_trousers"
    && readNestedItem(values, "lower", "material") === "material.linen";
}

function readNested(value: unknown, first: string, second: string): unknown {
  if (value === null || Array.isArray(value) || typeof value !== "object") return undefined;
  const child = (value as Readonly<Record<string, unknown>>)[first];
  return child !== null && !Array.isArray(child) && typeof child === "object"
    ? (child as Readonly<Record<string, unknown>>)[second]
    : undefined;
}

function readNestedItem(value: unknown, item: string, field: string): unknown {
  const garment = value !== null && !Array.isArray(value) && typeof value === "object"
    ? (value as Readonly<Record<string, unknown>>).garment
    : undefined;
  if (garment === null || Array.isArray(garment) || typeof garment !== "object") return undefined;
  const candidate = (garment as Readonly<Record<string, unknown>>)[item];
  return candidate !== null && !Array.isArray(candidate) && typeof candidate === "object"
    ? (candidate as Readonly<Record<string, unknown>>)[field]
    : undefined;
}
