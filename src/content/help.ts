// Per-level help: the idea the level teaches, what the open actions do here,
// and the stages a civilization passes through on its way to the goal. The
// stage index is computed live by the solver in src/game/hints.ts, so the
// journey overlay and the Stuck? popup always agree about where you are.

export interface Stage {
  label: string;
  detail: string;
}

export interface LevelHelp {
  concept: string;
  howTo: string[];
  tip: string;
  stages: Stage[];
}

export const LEVEL_HELP: Record<string, LevelHelp> = {
  river: {
    concept: "Order effects. The two questions of a pair are incompatible observables (Z and X on the same cohort), so asking them in a different order gives different statistics.",
    howTo: [
      "Pick a cohort in the ASK panel, choose a question, and press Ask. The answer is drawn by the Born rule from the probabilities shown on the button.",
      "Ask the same cohort the other question. The level ends and shows what the other order would have looked like.",
    ],
    tip: "Ask the register question (Z) first. The founding state is certain of it, so the first answer costs nothing and the second is a fair coin.",
    stages: [
      { label: "Ask the register question", detail: "The river: a Z ask. The founding state already knows this answer." },
      { label: "Ask the indefinite question", detail: "The neighbour: an X ask. Now it is a coin, because the river answer is sharp." },
      { label: "See the order you did not choose", detail: "The same answers in the other order come from different distributions." },
    ],
  },
  crossing: {
    concept: "Braiding makes facts travel. Braiding conserves parity, so no one becomes certain of an X answer by braiding alone. Ask someone first, then braid the fact across and turn it to face the question.",
    howTo: [
      "Ask the Elders the neighbour question. Whatever they answer becomes a sharp fact.",
      "Braid σ₂, the exchange between the Elders and the Smiths. The fact spreads across both cohorts.",
      "Braid σ₃ or σ₃⁻¹, a ritual within the Smiths, to turn the fact toward GUEST. Which one depends on what the Elders said.",
    ],
    tip: "Never ask the Smiths. Watch p(GUEST) on their X button climb to 1.00 without an ask.",
    stages: [
      { label: "Create a fact", detail: "Ask the Elders the neighbour question." },
      { label: "Exchange across", detail: "σ₂ entangles the Elders and the Smiths, carrying the fact." },
      { label: "Turn it to face the question", detail: "A ritual σ₃ (or its inverse) rotates the Smiths into GUEST." },
    ],
  },
  order: {
    concept: "The braid group does not commute. σ₂σ₃ and σ₃σ₂ are different unitaries, so the same two crossings in the other order make a different civilization.",
    howTo: [
      "Only σ₂ and σ₃ are open. Braid them in the order that reaches the target state, where the Smiths would say RELY.",
      "Once you have used both crossings, the game shows the clouds of both orders side by side.",
    ],
    tip: "Exchange first, ritual second. The fact the Elders hold must arrive before it is turned.",
    stages: [
      { label: "Exchange σ₂", detail: "The Elders' certainty of RELY spreads to the Smiths." },
      { label: "Ritual σ₃", detail: "Turn the Smiths so the trust question reads sharp." },
      { label: "Compare both orders", detail: "σ₃σ₂ leaves the Smiths on a coin." },
    ],
  },
  ownership: {
    concept: "Incompatible questions. Writing sharp ownership into the register makes obligation indefinite, and settling obligation blurs the register. Braiding can restore an answer that an incompatible ask erased.",
    howTo: [
      "Write the register first: ask a cohort the ownership question (Z) twice while nothing else is at stake.",
      "Ask each cohort what is owed (X). A FREE answer is not the end: two rituals on that cohort turn FREE into OWED, and a re-ask makes it official.",
      "The level is won when every cohort's latest obligation answer is OWED and the register holds two ownership entries.",
    ],
    tip: "Do the register asks before the obligation asks. Asking ownership after an OWED answer would erase it.",
    stages: [
      { label: "Write the register", detail: "Two ownership asks (Z) while every cohort is still certain of MINE." },
      { label: "Braid obligation into place", detail: "Rituals turn a cohort toward OWED before you ask." },
      { label: "Ask what is owed", detail: "Each cohort's latest answer must be OWED." },
    ],
  },
  unasked: {
    concept: "Interference. The questions you never ask keep interfering, and that interference is the peace. A classical mixture, where each cohort had secretly decided, could not reach it.",
    howTo: [
      "Braid only. The target is σ₂ σ₃ σ₄ σ₅: exchange, ritual, exchange, ritual, carrying the Elders' welcome down the line.",
      "Watch the interference readout: quantum p(ENTER) climbs to 1.00 while the classical mixture stays at 0.50.",
    ],
    tip: "Any ask ends the level. The peace only exists while the question stays unasked.",
    stages: [
      { label: "Exchange σ₂", detail: "Elders and Smiths share the welcome." },
      { label: "Ritual σ₃", detail: "Turn the Smiths to face ENTER." },
      { label: "Exchange σ₄", detail: "Smiths and Traders share it." },
      { label: "Ritual σ₅", detail: "Turn the Traders. All three would say ENTER, and no one was asked." },
    ],
  },
  care: {
    concept: "Deprivation is decoherence. A cohort going without loses a quarter of its deprivation from its coherence every season. An answered need is a superposition in exactly the basis the seasons erode.",
    howTo: [
      "Give care to the two cohorts going without. Each care lowers deprivation by 0.1 and costs a season.",
      "Let seasons pass while nothing is at stake. Unasked cohorts do not erode.",
      "Ask every cohort the need question in the last four seasons, least deprived first, so the answers have little time to fade.",
    ],
    tip: "Care first, ask last. Coherence must still be at or above 60 when season 10 ends.",
    stages: [
      { label: "Give care", detail: "Lower the deprivation of the Smiths and the Traders." },
      { label: "Let the seasons pass", detail: "Nothing erodes while no one has been asked." },
      { label: "Ask everyone about need", detail: "Four asks in the last four seasons." },
      { label: "Contact", detail: "At season six, something meets the civilization and reflects how it looked." },
    ],
  },
  suppression: {
    concept: "Hidden decoherence. The register lists three cohorts but the dial reads four. Someone no question reaches is carrying the loss for everyone.",
    howTo: [
      "The CARE panel lets you give care to the unlisted cohort. Four cares bring their deprivation from 0.4 to zero.",
      "Then let the seasons pass. The listed cohorts sit in register states and do not erode.",
    ],
    tip: "Do not braid or ask. A superposed cohort would start eroding, and the seasons are what you need to survive.",
    stages: [
      { label: "Care for the unlisted", detail: "Four cares for the cohort the register hides." },
      { label: "Endure", detail: "Hold above 60 coherence until season 12." },
      { label: "The register lists them", detail: "At season six the Newcomers appear." },
    ],
  },
  federation: {
    concept: "A Bell test. The CHSH quantity S is at most 2 for any answers agreed in advance. An exchange across the cut gives S = 2√2. Nothing classical can fake that.",
    howTo: [
      "The opening braid bound the Smiths to the Elders with σ₂. Undo it with σ₂⁻¹ so the Smiths are free to entangle across the cut.",
      "Braid σ₄, the only exchange that crosses the cut, then run the Bell test.",
    ],
    tip: "Watch the live S in the goal line. Run the test only when it reads above 2.2.",
    stages: [
      { label: "Unbind the Smiths", detail: "σ₂⁻¹ undoes the opening exchange." },
      { label: "Exchange across the cut", detail: "σ₄ entangles the Smiths and the Traders." },
      { label: "Run the Bell test", detail: "S > 2.2 proves the alliance is real." },
    ],
  },
  sandbox: {
    concept: "Deep time. No goal but survival. Eras turn every four seasons and change the questions. When the civilization collapses, its last three crossings become a myth that opens the next one.",
    howTo: [
      "Care for whoever is going without, then let the seasons pass. A civilization that is not asked does not erode.",
      "Braid and ask if you want to see collapse and the myth it leaves; the level welcomes it.",
    ],
    tip: "Twenty-four seasons is the whole of deep time. Care early, and nothing you have not braided will fade.",
    stages: [
      { label: "Care", detail: "Lower every deprivation you can." },
      { label: "Endure the eras", detail: "Six eras, twenty-four seasons." },
    ],
  },
};

export function helpFor(levelId: string): LevelHelp {
  return (
    LEVEL_HELP[levelId] ?? {
      concept: "",
      howTo: [],
      tip: "",
      stages: [{ label: "Play", detail: "" }],
    }
  );
}
