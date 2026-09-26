import type { EntityId } from "@/game/contact";

export interface CodexEntry {
  id: EntityId;
  name: string;
  tagline: string;
  /** what kind of looking produces this entity */
  lookedFor: string;
  entry: string;
}

export const CODEX_DISCLAIMER =
  "These are morphological clusters in witness testimony, patterned by geography and era. They are not species. What you met is a function of how you looked.";

export const CODEX: Record<EntityId, CodexEntry> = {
  greys: {
    id: "greys",
    name: "Greys",
    tagline: "Small, grey, large-eyed, procedural.",
    lookedFor: "A civilization that asked mostly about ownership and merit, sharply, in the register basis.",
    entry:
      "Cluster G. Reported since the mid-twentieth century in industrialised regions, almost always at night and almost always indoors. Witnesses describe small figures with large dark eyes, uniform grey skin and no visible instruments of speech, engaged in examination, cataloguing or extraction. The testimony is procedural: the entities measure, sort and record. The cluster is strongest where the witnesses' own societies had recently made property, identity and medical status into sharp administrative facts. Researchers note that the Greys never ask; they take readings. In the catalogue they are treated as the mirror of a people that registers itself.",
  },
  nordics: {
    id: "nordics",
    name: "Nordics",
    tagline: "Tall, luminous, admonishing.",
    lookedFor: "A civilization that asked mostly about obligation and need, in the indefinite basis.",
    entry:
      "Cluster N. Tall, fair, unhurried figures who arrive to warn rather than to examine. The testimony is ecological: the entities speak of balance, of debts to the land, of what will be lost if the witnesses continue. The cluster dominates in rural and coastal testimony and in periods of environmental anxiety. Notably, Nordics are reported to ask questions of the witness, and the questions concern obligation. The catalogue reads them as the mirror of a people that has made mutual obligation its sharpest fact and has left ownership to blur.",
  },
  "hairy-dwarfs": {
    id: "hairy-dwarfs",
    name: "Hairy dwarfs",
    tagline: "Short, hirsute, territorial.",
    lookedFor: "A civilization that asked, sharply, what the river is.",
    entry:
      "Cluster H. Short, densely haired figures encountered at field edges, fords and boundary stones, chiefly in agrarian testimony from the nineteenth century onward. The entities are described as guarding, blocking or claiming ground. There is very little speech. The cluster tracks boundary disputes with remarkable fidelity: where a community has recently drawn a sharp line across a landscape, the line acquires a guardian. The catalogue treats the Hairy dwarfs as the mirror of a people that asked what the river was and answered: a boundary.",
  },
  giants: {
    id: "giants",
    name: "Giants",
    tagline: "Vast, silent, seen from far away.",
    lookedFor: "A civilization that asked about security, often and sharply.",
    entry:
      "Cluster T. Very large figures reported at a distance, on ridgelines, at the edge of forests, or standing in the sea. They do not approach. The testimony is defensive in tone: witnesses describe watching, counting, preparing. The cluster appears in societies under military or political threat and fades when the threat is resolved or forgotten. The Giants rarely do anything at all; their entire effect is that they are there. The catalogue reads them as the mirror of a people whose first and most frequent question was whether it was safe.",
  },
  "human-passing": {
    id: "human-passing",
    name: "Human-passing entities",
    tagline: "Almost one of us.",
    lookedFor: "A civilization that asked, sharply, who counts as us.",
    entry:
      "Cluster P. Figures indistinguishable from people until a detail betrays them: the wrong clothes for the decade, an accent that cannot be placed, an inability to answer a simple question about the town. They are reported in queues, on trains, at doors. The testimony is anxious about membership. The cluster is strongest where a society has made the question of who belongs into a sharp administrative fact and is watching its edges. The catalogue treats the Human-passing entities as the mirror of a people that asked whether the stranger was us.",
  },
  amphibians: {
    id: "amphibians",
    name: "Amphibians",
    tagline: "Aquatic, arriving by water, trusted or not.",
    lookedFor: "A civilization that asked, in the indefinite basis, whether the neighbour could be relied on.",
    entry:
      "Cluster A. Damp, smooth-skinned or scaled figures reported at rivers, lakes and harbours, often arriving by water and often leaving something behind: a gift, a warning, a child. The testimony is ambivalent about trust in a way that other clusters are not. Witnesses cannot decide whether they were helped or harmed. The cluster appears in societies whose central question was reliance on the other side of a boundary, asked without a settled answer. The catalogue reads the Amphibians as the mirror of a people that kept the neighbour question open.",
  },
  exotic: {
    id: "exotic",
    name: "Exotic and luminous",
    tagline: "Light, geometry, no body to describe.",
    lookedFor: "A civilization that had barely asked anything, or asked in every direction at once.",
    entry:
      "Cluster X. Testimony in which the witness cannot supply a body at all: lights, geometries, a presence, a change in the air. These reports are the oldest in the catalogue and the most evenly distributed across geography and era. They dominate wherever a society has not yet committed to a basis, where few questions have been asked, or where the questions asked pulled equally in incompatible directions. The catalogue does not read the luminous cluster as a mirror of any particular question. It is what looking looks like before it has chosen what to look for.",
  },
};

export const CODEX_ORDER: EntityId[] = ["greys", "nordics", "hairy-dwarfs", "giants", "human-passing", "amphibians", "exotic"];
