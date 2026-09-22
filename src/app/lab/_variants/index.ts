import type { ComponentType } from "react";
import type { LabData } from "../_shared/content";
import { FrontendDesign } from "./01-frontend-design";
import { TasteSkill } from "./02-taste-skill";
import { GptTaste } from "./03-gpt-taste";
import { SoftSkill } from "./04-soft-skill";
import { Minimalist } from "./05-minimalist";
import { Brutalist } from "./06-brutalist";
import { Impeccable } from "./07-impeccable";
import { UiUxProMax } from "./08-ui-ux-pro-max";
import { ThemeFactory } from "./09-theme-factory";
import { Redesign } from "./10-redesign";
import { AlgorithmicArt } from "./11-algorithmic-art";
import { CanvasDesign } from "./12-canvas-design";
import { WebGuidelines } from "./13-web-guidelines";
import { ViewTransitions } from "./14-view-transitions";
import { BestPractices } from "./15-best-practices";
import { EmilDesignEng } from "./16-emil-design-eng";
import { AppleDesign } from "./17-apple-design";
import { AnimationVocabulary } from "./18-animation-vocabulary";
import { FindAnimationOpportunities } from "./19-find-animation-opportunities";
import { MobileNative } from "./20-mobile-native";
import { GsapScrollTrigger } from "./21-gsap-scrolltrigger";
import { GsapReact } from "./22-gsap-react";
import { BaselineUi } from "./23-baseline-ui";
import { FixingMotionPerformance } from "./24-fixing-motion-performance";
import { DesignMotionPrinciples } from "./25-design-motion-principles";

export type Variant = {
  slug: string;
  label: string;
  /** Скилл, по правилам которого вариант построен. */
  skill: string;
  /** Одна строка: что этот скилл сделал со страницей. */
  idea: string;
  Component: ComponentType<{ data: LabData }>;
  /** Насколько поднять переключатель лаборатории над низом экрана, px —
   *  если у варианта своя нижняя панель (иначе они наезжают друг на друга). */
  switcherBottom?: number;
};

// Порядок — по источнику, как в .claude/skills/README.md. 1–15 — первая
// партия скиллов, 16–25 — добор того же дня.
export const VARIANTS: Variant[] = [
  { slug: "overworld", label: "Overworld", skill: "frontend-design", idea: "Palette from the game's daytime sky; the hero image builds itself block by block", Component: FrontendDesign },
  { slug: "stack", label: "Stack", skill: "taste-skill", idea: "Design read + dials 8/7/3: kinetic type, work cards that stack as you scroll", Component: TasteSkill },
  { slug: "cinema", label: "Cinema", skill: "gpt-taste", idea: "AIDA: cinematic hero, gapless bento, pinned gallery, words that light up on scroll", Component: GptTaste },
  { slug: "agency", label: "Agency", skill: "soft-skill", idea: "Soft structuralism: double-bezel cards, floating island nav, full-screen menu", Component: SoftSkill },
  { slug: "document", label: "Document", skill: "minimalist-skill", idea: "Warm monochrome, serif headings, bento in hairlines, like a well-kept doc", Component: Minimalist },
  { slug: "blueprint", label: "Blueprint", skill: "brutalist-skill", idea: "Swiss industrial print: newsprint, carbon ink, hazard red, visible grid", Component: Brutalist },
  { slug: "inventory", label: "Inventory", skill: "impeccable", idea: "The audience's own interface: inventory slots, tooltips, a crafting recipe", Component: Impeccable },
  { slug: "blocks", label: "Blocks", skill: "ui-ux-pro-max", idea: "Its own database pick: Vibrant & Block-based, Russo One, testimonial carousel", Component: UiUxProMax },
  { slug: "galaxy", label: "Galaxy", skill: "theme-factory", idea: "Midnight Galaxy theme; the landing as a deck of full-screen slides", Component: ThemeFactory },
  { slug: "evolved", label: "Evolved", skill: "redesign-skill", idea: "Today's home page, audited and upgraded: same order and brand, one accent", Component: Redesign },
  { slug: "seed", label: "Seed", skill: "algorithmic-art", idea: "A live generative world map: a new seed on every visit", Component: AlgorithmicArt },
  { slug: "strata", label: "Strata", skill: "canvas-design", idea: "The page as a cross-section of the world: sky, grass, stone, bedrock", Component: CanvasDesign },
  { slug: "correct", label: "Correct", skill: "web-design-guidelines", idea: "Every Vercel interface rule applied; sortable builds table kept in the URL", Component: WebGuidelines },
  { slug: "morph", label: "Morph", skill: "react-view-transitions", idea: "Gallery where a build morphs into its detail card (View Transitions)", Component: ViewTransitions },
  { slug: "zero", label: "Zero", skill: "react-best-practices", idea: "No JavaScript at all, system fonts, CSS scroll-driven motion", Component: BestPractices },
  { slug: "polish", label: "Polish", skill: "emil-design-eng", idea: "Emil's craft: clip-path tabs, compare slider, image reveals, Sonner toasts", Component: EmilDesignEng },
  { slug: "fluid", label: "Fluid", skill: "apple-design", idea: "Springs, a flickable gallery with momentum, a swipe-to-dismiss sheet", Component: AppleDesign },
  { slug: "glossary", label: "Glossary", skill: "animation-vocabulary", idea: "Every motion on the page labelled with its proper name", Component: AnimationVocabulary },
  { slug: "restraint", label: "Restraint", skill: "find-animation-opportunities", idea: "Only 5 animations survive the gate; toggle the audit to see why", Component: FindAnimationOpportunities },
  { slug: "pocket", label: "Pocket", skill: "mobile-native", idea: "Feels like an installed app on a phone: tab bar, Vaul sheets, safe areas", Component: MobileNative, switcherBottom: 84 },
  { slug: "scroll", label: "Scroll", skill: "gsap-scrolltrigger", idea: "GSAP ScrollTrigger: pinned hero reveal, horizontal gallery, scrubbed steps", Component: GsapScrollTrigger },
  { slug: "timeline", label: "Timeline", skill: "gsap-react", idea: "useGSAP: SplitText intro, Flip filter, Draggable reviews, magnetic buttons", Component: GsapReact },
  { slug: "baseline", label: "Baseline", skill: "baseline-ui", idea: "Deslopped: Tailwind defaults, Base UI primitives, almost no motion", Component: BaselineUi },
  { slug: "smooth", label: "Smooth", skill: "fixing-motion-performance", idea: "Lots of motion done right, with a live FPS meter to check it", Component: FixingMotionPerformance },
  { slug: "lenses", label: "Lenses", skill: "design-motion-principles", idea: "Jakub's polish plus Jhey's CSS toys: a 3D grass block, a spinning border", Component: DesignMotionPrinciples },
];
