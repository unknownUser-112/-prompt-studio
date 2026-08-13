import type { PromptSectionProvider } from "../../contracts/plugins/plugin-registrar";
import { createResolvedFragmentDraft, createResolvedSectionDraft } from "../../contracts/plugins/create-resolved-section-draft";

const BASELINE_DE = "OUTFIT & ACCESSOIRES\nSie trägt ein klassisches T-Shirt in Weiß, eine High-Waist-Jeans in Denimblau und weiße klassische Sneaker. Das Outfit besteht aus einer einzelnen, sauber wirkenden Schicht. Oberteil besteht aus baumwolle; sichtbare Maschenstruktur, weicher Fall und natürliche Dehnung, fällt ruhig und folgt Körperhaltung und Schwerkraft und schulter-, Brust-, Taillen- und Saumbereich zeigen materialgerechte Spannung statt aufgemalter Stoffoberfläche. Hose besteht aus denim; feste Denim-Webung, stabile Zugfalten und glaubwürdige Nähte, fällt ruhig und folgt Körperhaltung und Schwerkraft und bund, Knie- und Hüftbereich zeigen belastungsabhängige Zug-, Kompressions- und Sitzfalten. Schuhe besteht aus leder-Textil-Mischung; materialgerechte Stärke, Falten an den Gelenken und zurückhaltende Reflexionen, fällt ruhig und folgt Körperhaltung und Schwerkraft und sohle, Obermaterial und Fußstellung folgen dem Bodenkontakt; keine schwebenden oder verformten Schuhe.";
const BASELINE_EN = "OUTFIT AND ACCESSORIES\nShe wears a classic T-shirt in white, high-waisted jeans in denim blue, and classic white sneakers. The outfit uses cotton, denim, and leather-textile blend. Fabric tension, folds, seams, reflections, and material thickness respond naturally to posture, movement, gravity, and wind. Fabric folds originate from gravity, body contact points, garment construction, and movement; avoid decorative, mirrored, or repetitive wrinkle patterns.";

export const garmentSection: PromptSectionProvider = {
  id: "garment",
  provide: (state) => {
    const german = state.facts.values.promptLanguage === "Deutsch";
    const outfit = german
      ? "Sie trägt ein klassisches T-Shirt in Weiß, eine High-Waist-Jeans in Denimblau und weiße klassische Sneaker."
      : "She wears a classic T-shirt in white, high-waisted jeans in denim blue, and classic white sneakers.";
    const materialBehaviour = german
      ? "Oberteil besteht aus baumwolle; sichtbare Maschenstruktur, weicher Fall und natürliche Dehnung, fällt ruhig und folgt Körperhaltung und Schwerkraft und schulter-, Brust-, Taillen- und Saumbereich zeigen materialgerechte Spannung statt aufgemalter Stoffoberfläche. Hose besteht aus denim; feste Denim-Webung, stabile Zugfalten und glaubwürdige Nähte, fällt ruhig und folgt Körperhaltung und Schwerkraft und bund, Knie- und Hüftbereich zeigen belastungsabhängige Zug-, Kompressions- und Sitzfalten. Schuhe besteht aus leder-Textil-Mischung; materialgerechte Stärke, Falten an den Gelenken und zurückhaltende Reflexionen, fällt ruhig und folgt Körperhaltung und Schwerkraft und sohle, Obermaterial und Fußstellung folgen dem Bodenkontakt; keine schwebenden oder verformten Schuhe."
      : "The outfit uses cotton, denim, and leather-textile blend. Fabric tension, folds, seams, reflections, and material thickness respond naturally to posture, movement, gravity, and wind. Fabric folds originate from gravity, body contact points, garment construction, and movement; avoid decorative, mirrored, or repetitive wrinkle patterns.";
    const outfitFragment = createResolvedFragmentDraft(
      state,
      "garment",
      "garment.outfit",
      outfit,
      ["garment.footwear.color", "garment.footwear.kind", "garment.lower.color", "garment.lower.kind", "garment.upper.color", "garment.upper.kind"],
    );
    const materialFragment = createResolvedFragmentDraft(
      state,
      "garment",
      "garment.material-behaviour",
      materialBehaviour,
      ["garment.footwear.color", "garment.footwear.kind", "garment.lower.color", "garment.lower.kind", "garment.upper.color", "garment.upper.kind"],
    );
    const fragments = german ? [
      outfitFragment,
      createResolvedFragmentDraft(state, "garment", "garment.outfit-build", "Das Outfit besteht aus einer einzelnen, sauber wirkenden Schicht.", ["garment.outfitBuild"]),
      materialFragment,
    ] : [outfitFragment, materialFragment];
    return [createResolvedSectionDraft(state, "garment", `${german ? BASELINE_DE : BASELINE_EN}\n`, fragments)];
  },
};
