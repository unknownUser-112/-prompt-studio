import type { PromptSectionProvider } from "../../contracts/plugins/plugin-registrar";
import { createResolvedFragmentDraft, createResolvedSectionDraft } from "../../contracts/plugins/create-resolved-section-draft";

const BASELINE_DE = "OUTFIT & ACCESSOIRES\nSie trägt ein klassisches T-Shirt in Weiß, eine High-Waist-Jeans in Denimblau und weiße klassische Sneaker. Das Outfit besteht aus einer einzelnen, sauber wirkenden Schicht. Oberteil besteht aus baumwolle; sichtbare Maschenstruktur, weicher Fall und natürliche Dehnung, fällt ruhig und folgt Körperhaltung und Schwerkraft und schulter-, Brust-, Taillen- und Saumbereich zeigen materialgerechte Spannung statt aufgemalter Stoffoberfläche. Hose besteht aus denim; feste Denim-Webung, stabile Zugfalten und glaubwürdige Nähte, fällt ruhig und folgt Körperhaltung und Schwerkraft und bund, Knie- und Hüftbereich zeigen belastungsabhängige Zug-, Kompressions- und Sitzfalten. Schuhe besteht aus leder-Textil-Mischung; materialgerechte Stärke, Falten an den Gelenken und zurückhaltende Reflexionen, fällt ruhig und folgt Körperhaltung und Schwerkraft und sohle, Obermaterial und Fußstellung folgen dem Bodenkontakt; keine schwebenden oder verformten Schuhe.";
const BASELINE_EN = "OUTFIT AND ACCESSORIES\nShe wears a classic T-shirt in white, high-waisted jeans in denim blue, and classic white sneakers. The outfit uses cotton, denim, and leather-textile blend. Fabric tension, folds, seams, reflections, and material thickness respond naturally to posture, movement, gravity, and wind. Fabric folds originate from gravity, body contact points, garment construction, and movement; avoid decorative, mirrored, or repetitive wrinkle patterns.";
const MATERIAL_CONSISTENCY_DE = "Materialreflexionen, Falten, Nähte und Materialdicke folgen der Körperhaltung und der Schwerkraft.";
const MATERIAL_CONSISTENCY_EN = "Fabric tension, folds, seams, reflections, and material thickness respond naturally to posture, movement, gravity, and wind.";
const ORGANZA_OUTFIT_DE = "Sie trägt eine offen getragene, leichte Organza-Bluse mit klarer Stoffstruktur in Weiß, eine High-Waist-Jeans in Denimblau und weiße klassische Sneaker.";
const ORGANZA_MATERIAL_BEHAVIOUR_DE = "Oberteil besteht aus organza; feine, leicht steife Transparenz mit dezentem Schimmer, fällt ruhig und folgt Körperhaltung und Schwerkraft und schulter-, Brust-, Taillen- und Saumbereich zeigen materialgerechte Spannung statt aufgemalter Stoffoberfläche. Hose besteht aus denim; feste Denim-Webung, stabile Zugfalten und glaubwürdige Nähte, fällt ruhig und folgt Körperhaltung und Schwerkraft und bund, Knie- und Hüftbereich zeigen belastungsabhängige Zug-, Kompressions- und Sitzfalten. Schuhe besteht aus leder-Textil-Mischung; materialgerechte Stärke, Falten an den Gelenken und zurückhaltende Reflexionen, fällt ruhig und folgt Körperhaltung und Schwerkraft und sohle, Obermaterial und Fußstellung folgen dem Bodenkontakt; keine schwebenden oder verformten Schuhe.";
const ORGANZA_UPPER_BODY_DE = "Das ausgewählte Kleidungsstück „eine offen getragene, leichte Organza-Bluse mit klarer Stoffstruktur in Weiß aus Organza“ ist das einzige am Oberkörper getragene Kleidungsstück der Hauptperson.";
const ORGANZA_LAYERING_DE = "Darunter und darüber befindet sich kein weiteres Oberteil: kein T-Shirt, Tanktop, Camisole, Crop-Top, Body, Unterhemd, Baselayer, Bralette, BH, Pullover, Cardigan, Jacke oder anderes zusätzliches Oberteil. Die offene Trageweise oder leichte Lichtdurchlässigkeit ist keine Erlaubnis, eine Bedeckungs- oder Basisschicht zu ergänzen. Öffnung, Material, Farbe, Passform und Silhouette des ausgewählten Kleidungsstücks unverändert beibehalten.";
const ORGANZA_STATE_DE = "Das ausgewählte Oberteil wird sichtbar offen getragen. Die ausgewählte vordere Knopfleiste bleibt im sichtbaren Oberkörperbereich eindeutig geöffnet. Kein sichtbarer Knopf verbindet die beiden Vorderteile. Die beiden Vorderteile bleiben entlang der sichtbaren Rumpfmitte getrennt und fallen entsprechend Material, Körperhaltung und Schwerkraft natürlich. Das Oberteil darf weder zugeknöpft, befestigt, überlappend geschlossen noch als geschlossenes Hemd oder geschlossene Bluse interpretiert werden. Öffnung, Material, Farbe, Passform und Silhouette unverändert erhalten. Keine nicht ausgewählte Oberkörper-Schicht ergänzen.";
const COMPACT_SELECTION_RESTRICTION_DE = "Keine nicht ausgewählten Kleidungsstücke oder zusätzlichen Schichten ergänzen.";
const COMPACT_SELECTION_RESTRICTION_EN = "Do not add any unselected garment or extra layer.";
const COMPACT_VOILE_LAYER_CONTRACT_EN = "The selected garment, an airy voile shirt worn open with a fine woven texture in white, is the primary subject's only upper-body garment. Every front button is visibly undone from collar to lower hem. The two front panels remain visibly separated as an open shirt front along the torso and drape naturally according to the material, posture, and gravity. The shirt must not read as buttoned, fastened, closed, or replaced by another top. No T-shirt, tank top, camisole, crop top, bodysuit, undershirt, base layer, bralette, bra, sweater, cardigan, or other top is worn beneath or over it. Keep the presentation incidental, realistic, and non-sexualized; do not eroticize or visually emphasize the chest area.";
const COMPACT_ORGANZA_LAYER_CONTRACT_DE = "Das eine offen getragene, leichte Organza-Bluse mit klarer Stoffstruktur in Weiß aus Organza ist das einzige Oberkörper-Kleidungsstück der Hauptperson. Alle vorderen Knöpfe sind vom Kragen bis zum unteren Saum sichtbar geöffnet. Die beiden Vorderteile bleiben entlang des Oberkörpers als offene Hemdfront erkennbar und fallen entsprechend Material, Körperhaltung und Schwerkraft natürlich. Das Hemd darf nicht wie zugeknöpft, geschlossen oder durch ein anderes Oberteil ersetzt wirken. Darunter oder darüber befindet sich kein T-Shirt, Tanktop, Camisole, Crop-Top, Body, Unterhemd, Baselayer, Bralette, BH, Pullover, Cardigan oder anderes Oberteil. Die Darstellung bleibt beiläufig, realistisch und nicht sexualisiert; der Brustbereich wird weder hervorgehoben noch erotisiert.";

export const garmentSection: PromptSectionProvider = {
  id: "garment",
  provide: (state) => {
    const german = state.facts.values.promptLanguage === "Deutsch";
    if (isOpenVoileShirt(state.values)) return [createOpenVoileDraft(state, german)];
    const openOrganza = isOpenOrganzaBlouse(state.values);
    const wideLegLinen = isWideLegLinenTrousers(state.values);
    const branding = resolvedBranding(state.values);
    const upperBrand = branding?.allowedGarment === "upper" ? branding : undefined;
    const footwearBrand = branding?.allowedGarment === "footwear" ? branding : undefined;
    const smoothLeather = readNestedItem(state.values, "footwear", "material") === "material.smooth_leather";
    const outfit = german
      ? openOrganza
        ? ORGANZA_OUTFIT_DE
        : upperBrand === undefined
        ? "Sie trägt ein klassisches T-Shirt in Weiß, eine High-Waist-Jeans in Denimblau und weiße klassische Sneaker."
        : `Sie trägt ein klassisches T-Shirt in Weiß von ${upperBrand.name}, eine High-Waist-Jeans in Denimblau und weiße klassische Sneaker.`
      : wideLegLinen
        ? "She wears a classic T-shirt in white, wide-leg linen trousers in denim blue, and classic white sneakers."
        : footwearBrand === undefined
          ? "She wears a classic T-shirt in white, high-waisted jeans in denim blue, and classic white sneakers."
          : `She wears a classic T-shirt in white, high-waisted jeans in denim blue, and classic white sneakers by ${footwearBrand.name}${footwearBrand.model === undefined ? "" : ` model ${footwearBrand.model}`}.`;
    const materialBehaviour = german
      ? openOrganza
        ? ORGANZA_MATERIAL_BEHAVIOUR_DE
        : "Oberteil besteht aus baumwolle; sichtbare Maschenstruktur, weicher Fall und natürliche Dehnung, fällt ruhig und folgt Körperhaltung und Schwerkraft und schulter-, Brust-, Taillen- und Saumbereich zeigen materialgerechte Spannung statt aufgemalter Stoffoberfläche. Hose besteht aus denim; feste Denim-Webung, stabile Zugfalten und glaubwürdige Nähte, fällt ruhig und folgt Körperhaltung und Schwerkraft und bund, Knie- und Hüftbereich zeigen belastungsabhängige Zug-, Kompressions- und Sitzfalten. Schuhe besteht aus leder-Textil-Mischung; materialgerechte Stärke, Falten an den Gelenken und zurückhaltende Reflexionen, fällt ruhig und folgt Körperhaltung und Schwerkraft und sohle, Obermaterial und Fußstellung folgen dem Bodenkontakt; keine schwebenden oder verformten Schuhe."
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
      ...(openOrganza ? ["garment.open", "garment.upper.material"] : []),
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
      ...(openOrganza ? ["garment.open", "garment.upper.material"] : []),
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
    const compactOutfitFragment = createCompactOutfitFragment(state, german);
    const compactItemsFragment = german ? createCompactItemsFragment(state) : undefined;
    const compactSelectionRestriction = createCompactSelectionRestriction(state, german);
    const compactUpperLayerContract = createCompactUpperLayerContract(state, german);
    const openOrganzaFragments = openOrganza ? createOpenOrganzaFragments(state) : [];
    const fragments = german ? [
      ...openOrganzaFragments,
      outfitFragment,
      ...(compactOutfitFragment === undefined ? [] : [compactOutfitFragment]),
      ...(compactItemsFragment === undefined ? [] : [compactItemsFragment]),
      ...(compactSelectionRestriction === undefined ? [] : [compactSelectionRestriction]),
      ...(compactUpperLayerContract === undefined ? [] : [compactUpperLayerContract]),
      createResolvedFragmentDraft(state, "garment", "garment.outfit-build", "Das Outfit besteht aus einer einzelnen, sauber wirkenden Schicht.", ["garment.outfitBuild"]),
      materialFragment,
      ...(materialConsistencyFragment === undefined ? [] : [materialConsistencyFragment]),
    ] : [
      outfitFragment,
      ...(compactOutfitFragment === undefined ? [] : [compactOutfitFragment]),
      ...(compactSelectionRestriction === undefined ? [] : [compactSelectionRestriction]),
      ...(compactUpperLayerContract === undefined ? [] : [compactUpperLayerContract]),
      materialFragment,
      ...(materialConsistencyFragment === undefined ? [] : [materialConsistencyFragment]),
    ];
    const sectionText = german && openOrganza
      ? `OUTFIT & ACCESSOIRES\n${outfit} Das Outfit besteht aus einer einzelnen, sauber wirkenden Schicht. ${materialBehaviour}`
      : german && upperBrand !== undefined
      ? `OUTFIT & ACCESSOIRES\n${outfit} Das Outfit besteht aus einer einzelnen, sauber wirkenden Schicht. ${materialBehaviour}`
      : !german && (wideLegLinen || footwearBrand !== undefined)
      ? `OUTFIT AND ACCESSORIES\n${outfit} ${materialBehaviour}`
      : german ? BASELINE_DE : BASELINE_EN;
    return [createResolvedSectionDraft(state, "garment", `${sectionText}\n`, fragments)];
  },
};

function createOpenOrganzaFragments(state: Parameters<PromptSectionProvider["provide"]>[0]) {
  const upperPaths = ["garment.upper.color", "garment.upper.kind", "garment.upper.material"] as const;
  const statePaths = ["garment.open", ...upperPaths] as const;
  return [
    createResolvedFragmentDraft(state, "garment", "garment.upper-body", ORGANZA_UPPER_BODY_DE, upperPaths),
    createResolvedFragmentDraft(state, "garment", "garment.layering", ORGANZA_LAYERING_DE, statePaths),
    createResolvedFragmentDraft(state, "garment", "garment.state", ORGANZA_STATE_DE, statePaths),
  ];
}

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
  const compactOutfitFragment = createCompactOutfitFragment(state, german, true);
  const compactItemsFragment = german ? createCompactItemsFragment(state, true) : undefined;
  const compactSelectionRestriction = createCompactSelectionRestriction(state, german);
  const compactUpperLayerContract = createCompactUpperLayerContract(state, german);
  const fragments = [
    createResolvedFragmentDraft(state, "garment", "garment.upper-body", upperBody, ["garment.upper.color", "garment.upper.kind", "garment.upper.material"]),
    createResolvedFragmentDraft(state, "garment", "garment.layering", layering, ["garment.open", "garment.upper.color", "garment.upper.kind", "garment.upper.material", "garment.upperLayer"]),
    createResolvedFragmentDraft(state, "garment", "garment.state", garmentState, ["garment.open", "garment.upper.color", "garment.upper.kind", "garment.upper.material", "garment.upperLayer"]),
    createResolvedFragmentDraft(state, "garment", "garment.outfit", outfit, ["garment.footwear.color", "garment.footwear.kind", "garment.upper.color", "garment.upper.kind", "garment.upper.material"]),
    ...(compactOutfitFragment === undefined ? [] : [compactOutfitFragment]),
    ...(compactItemsFragment === undefined ? [] : [compactItemsFragment]),
    ...(compactSelectionRestriction === undefined ? [] : [compactSelectionRestriction]),
    ...(compactUpperLayerContract === undefined ? [] : [compactUpperLayerContract]),
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

function createCompactSelectionRestriction(
  state: Parameters<PromptSectionProvider["provide"]>[0],
  german: boolean,
) {
  if (!state.trace.entries.some(({ path }) => path === "garment.outfitBuild")) return undefined;
  return createResolvedFragmentDraft(
    state,
    "garment",
    "garment.compact-selection-restriction",
    german ? COMPACT_SELECTION_RESTRICTION_DE : COMPACT_SELECTION_RESTRICTION_EN,
    ["garment.outfitBuild"],
  );
}

function createCompactUpperLayerContract(
  state: Parameters<PromptSectionProvider["provide"]>[0],
  german: boolean,
) {
  if (readNested(state.values, "garment", "open") !== true) return undefined;
  const paths = ["garment.open", "garment.outfitBuild", "garment.upper.color", "garment.upper.kind", "material.upper"] as const;
  if (!paths.every((path) => state.trace.entries.some((entry) => entry.path === path))) return undefined;
  const material = readMaterial(state.values, "upper");
  const text = material === "Voile" && !german
    ? COMPACT_VOILE_LAYER_CONTRACT_EN
    : material === "Organza" && german
      ? COMPACT_ORGANZA_LAYER_CONTRACT_DE
      : undefined;
  if (text === undefined) return undefined;
  return createResolvedFragmentDraft(state, "garment", "garment.compact-upper-layer-contract", text, paths);
}

function createCompactOutfitFragment(
  state: Parameters<PromptSectionProvider["provide"]>[0],
  german: boolean,
  omitLower = false,
) {
  const requiredPaths = [
    "garment.footwear.color",
    "garment.footwear.kind",
    "garment.upper.color",
    "garment.upper.kind",
    "material.footwear",
    "material.upper",
    ...(!omitLower ? ["garment.lower.color", "garment.lower.kind", "material.lower"] : []),
  ];
  const branding = resolvedBranding(state.values);
  const brandPaths = branding === undefined
    ? []
    : ["brand.allowedGarment", "brand.name", ...(branding.model === undefined ? [] : ["brand.model"])] as const;
  const open = readNested(state.values, "garment", "open") === true;
  const paths = [...requiredPaths, ...(open ? ["garment.open"] : []), ...brandPaths];
  if (!paths.every((path) => state.trace.entries.some((entry) => entry.path === path))) return undefined;

  const upper = compactUpper(state.values, branding, german);
  const lower = omitLower ? undefined : compactLower(state.values, german);
  const footwear = compactFootwear(state.values, branding, german);
  const label = german ? "Outfit und Materialien: " : "Outfit and materials: ";
  return createResolvedFragmentDraft(
    state,
    "garment",
    "garment.compact-outfit",
    `${label}${[upper, lower, footwear].filter((part): part is string => part !== undefined).join("; ")}.`,
    paths,
  );
}

function createCompactItemsFragment(
  state: Parameters<PromptSectionProvider["provide"]>[0],
  omitLower = false,
) {
  const branding = resolvedBranding(state.values);
  const brandPaths = branding === undefined
    ? []
    : ["brand.allowedGarment", "brand.name", ...(branding.model === undefined ? [] : ["brand.model"])] as const;
  const open = readNested(state.values, "garment", "open") === true;
  const paths = [
    "garment.footwear.color",
    "garment.footwear.kind",
    "garment.upper.color",
    "garment.upper.kind",
    ...(!omitLower ? ["garment.lower.color", "garment.lower.kind"] : []),
    ...(open ? ["garment.open", "material.upper"] : []),
    ...brandPaths,
  ];
  if (!paths.every((path) => state.trace.entries.some((entry) => entry.path === path))) return undefined;
  const upperKind = readNestedItem(state.values, "upper", "kind");
  const upperColor = readNestedItem(state.values, "upper", "color");
  const upperMaterial = readMaterial(state.values, "upper");
  const upperBrand = branding?.allowedGarment === "upper" ? ` von ${branding.name}` : "";
  const upper = upperKind === "upperGarment.classic_tshirt" && upperColor === "color.white"
    ? `ein klassisches T-Shirt in Weiß${upperBrand}`
    : upperKind === "upperGarment.shirt" && upperColor === "color.white" && open && upperMaterial === "Voile"
      ? `ein offen getragenes, luftiges Voile-Hemd mit feiner Webstruktur in Weiß${upperBrand}`
      : upperKind === "upperGarment.shirt" && upperColor === "color.white" && open && upperMaterial === "Organza"
        ? `eine offen getragene, leichte Organza-Bluse mit klarer Stoffstruktur in Weiß${upperBrand}`
        : undefined;
  const lower = omitLower ? undefined : readNestedItem(state.values, "lower", "kind") === "lowerGarment.high_waist_jeans"
    && readNestedItem(state.values, "lower", "color") === "color.denim_blue"
    ? "eine High-Waist-Jeans in Denimblau"
    : readNestedItem(state.values, "lower", "kind") === "lowerGarment.wide_leg_linen_trousers"
      ? "eine Wide-Leg-Leinenhose"
      : undefined;
  const footwear = readNestedItem(state.values, "footwear", "kind") === "footwear.classic_sneakers"
    && readNestedItem(state.values, "footwear", "color") === "color.white"
    ? "weiße klassische Sneaker"
    : undefined;
  if (upper === undefined || footwear === undefined || (!omitLower && lower === undefined)) return undefined;
  return createResolvedFragmentDraft(
    state,
    "garment",
    "garment.compact-items",
    [upper, lower, footwear].filter((part): part is string => part !== undefined).join(", "),
    paths,
  );
}

function compactUpper(values: unknown, branding: ResolvedBranding | undefined, german: boolean): string {
  const kind = readNestedItem(values, "upper", "kind");
  const color = readNestedItem(values, "upper", "color");
  const material = readMaterial(values, "upper");
  const open = readNested(values, "garment", "open") === true;
  const brand = branding?.allowedGarment === "upper" ? ` ${german ? "von" : "by"} ${branding.name}` : "";
  if ((kind === "upperGarment.classic_tshirt" || (kind === "upperGarment.shirt" && !open))
    && color === "color.white" && (material === "material.cotton" || material === "Baumwolle")) {
    return german ? `ein klassisches T-Shirt in Weiß${brand} (Baumwolle)` : `a classic T-shirt in white${brand} (cotton)`;
  }
  if (kind === "upperGarment.shirt" && color === "color.white" && open && material === "Voile") {
    return german
      ? `ein offen getragenes, luftiges Voile-Hemd mit feiner Webstruktur in Weiß${brand} (Voile)`
      : `an airy voile shirt worn open with a fine woven texture in white${brand} (Voile)`;
  }
  if (kind === "upperGarment.shirt" && color === "color.white" && open && material === "Organza") {
    return german
      ? `eine offen getragene, leichte Organza-Bluse mit klarer Stoffstruktur in Weiß${brand} (Organza)`
      : `a lightweight organza blouse worn open with a clearly defined fabric texture in white${brand} (Organza)`;
  }
  throw new Error(`Unsupported resolved compact upper garment: ${String(kind)}, ${String(color)}, ${String(material)}, open=${open}`);
}

function compactLower(values: unknown, german: boolean): string {
  const kind = readNestedItem(values, "lower", "kind");
  const color = readNestedItem(values, "lower", "color");
  const material = readMaterial(values, "lower");
  if (kind === "lowerGarment.high_waist_jeans" && color === "color.denim_blue" && (material === "material.denim" || material === "Denim")) {
    return german ? "eine High-Waist-Jeans in Denimblau (Denim)" : "high-waisted jeans in denim blue (denim)";
  }
  if (kind === "lowerGarment.wide_leg_trousers" && color === "color.denim_blue" && material === "material.linen") {
    return german ? "eine weite Leinenhose in Denimblau (Leinen)" : "wide-leg linen trousers in denim blue (linen)";
  }
  throw new Error(`Unsupported resolved compact lower garment: ${String(kind)}, ${String(color)}, ${String(material)}`);
}

function compactFootwear(values: unknown, branding: ResolvedBranding | undefined, german: boolean): string {
  const kind = readNestedItem(values, "footwear", "kind");
  const color = readNestedItem(values, "footwear", "color");
  const material = readMaterial(values, "footwear");
  if (kind !== "footwear.classic_sneakers" || color !== "color.white") {
    throw new Error(`Unsupported resolved compact footwear: ${String(kind)}, ${String(color)}, ${String(material)}`);
  }
  const brand = branding?.allowedGarment === "footwear"
    ? ` ${german ? "von" : "by"} ${branding.name}${branding.model === undefined ? "" : ` ${german ? "Modell" : "model"} ${branding.model}`}`
    : "";
  if (material === "material.leather_textile") {
    return german ? `weiße klassische Sneaker${brand} (Leder-Textil-Mischung)` : `classic white sneakers${brand} (leather-textile blend)`;
  }
  if (material === "material.smooth_leather") {
    return german ? `weiße klassische Sneaker${brand} (glattes Leder)` : `classic white sneakers${brand} (smooth leather)`;
  }
  throw new Error(`Unsupported resolved compact footwear material: ${String(material)}`);
}

function readMaterial(values: unknown, slot: string): unknown {
  const material = objectAt(values, "material");
  return material?.[slot];
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

function isOpenOrganzaBlouse(values: unknown): boolean {
  return readNested(values, "garment", "open") === true
    && readNestedItem(values, "upper", "kind") === "upperGarment.shirt"
    && readNestedItem(values, "upper", "color") === "color.white"
    && readNestedItem(values, "upper", "material") === "Organza";
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
