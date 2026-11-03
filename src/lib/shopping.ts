import type { LifeOS, ShoppingList, ShoppingSection } from "./types";
import { getISOWeekKey } from "./dates";

export function newShoppingId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `sh_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

// Starting list — only used the first time; after that the saved list is the source of truth
const DEFAULT_SECTIONS: { name: string; items: string[] }[] = [
  {
    name: "Protein & dairy",
    items: [
      "~1.6–2 kg raw chicken breast",
      "2 salmon fillets (frozen is fine)",
      "1 lean steak or lean beef mince portion",
      "1 pack firm calcium-set tofu + edamame",
      "6 eggs + 1–2 tuna tins",
      "5–7 high-protein yoghurts",
      "Whey protein + creatine",
      "~2 L calcium-rich milk or fortified soy milk",
    ],
  },
  {
    name: "Beans, oats & pantry",
    items: [
      "225 g oats",
      "125 g whey for the breakfast jars",
      "50 g chia seeds",
      "50 g pumpkin seeds",
      "25 g unsweetened cocoa",
      "6–8 cans mixed beans/lentils/chickpeas",
      "Extra-virgin olive oil, iodised salt, herbs",
    ],
  },
  {
    name: "Fruit & vegetables",
    items: [
      "500 g frozen berries",
      "5 apples / mandarins / bananas",
      "1 kg frozen mixed vegetables",
      "Broccoli and spinach or rocket",
      "Capsicum, cucumber, tomato, carrots",
      "Red onion, lemon, garlic",
    ],
  },
];

function createDefaultShoppingList(): ShoppingList {
  const sections: ShoppingSection[] = DEFAULT_SECTIONS.map((section) => ({
    id: newShoppingId(),
    name: section.name,
    items: section.items.map((text) => ({ id: newShoppingId(), text, checked: false })),
  }));
  // No updatedAt: an untouched default never overrides a list synced from another device
  return { sections, checkedWeekKey: getISOWeekKey() };
}

/** Ensure the list exists, and clear last week's ticks once a new ISO week (Monday) starts */
export function ensureShoppingList(lifeOS: LifeOS): LifeOS {
  if (!lifeOS.shoppingList) {
    lifeOS.shoppingList = createDefaultShoppingList();
  }
  const currentWeekKey = getISOWeekKey();
  if (lifeOS.shoppingList.checkedWeekKey !== currentWeekKey) {
    lifeOS.shoppingList = {
      ...lifeOS.shoppingList,
      checkedWeekKey: currentWeekKey,
      sections: lifeOS.shoppingList.sections.map((section) => ({
        ...section,
        items: section.items.map((item) => ({ ...item, checked: false })),
      })),
    };
  }
  return lifeOS;
}
