import type { StorageLocation } from './models';

interface ShelfLifeByLocation {
  fridge: number;
  freezer: number;
  pantry: number;
}

const CATEGORY_SHELF_LIFE: Record<string, ShelfLifeByLocation> = {
  dairy:      { fridge: 10,  freezer: 90,  pantry: 3   },
  milk:       { fridge: 10,  freezer: 90,  pantry: 3   },
  cheese:     { fridge: 21,  freezer: 180, pantry: 7   },
  yogurt:     { fridge: 14,  freezer: 60,  pantry: 3   },
  butter:     { fridge: 30,  freezer: 365, pantry: 7   },
  eggs:       { fridge: 35,  freezer: 365, pantry: 7   },
  meat:       { fridge: 4,   freezer: 120, pantry: 1   },
  poultry:    { fridge: 3,   freezer: 120, pantry: 1   },
  fish:       { fridge: 3,   freezer: 120, pantry: 1   },
  seafood:    { fridge: 3,   freezer: 120, pantry: 1   },
  fruits:     { fridge: 14,  freezer: 365, pantry: 7   },
  vegetables: { fridge: 10,  freezer: 365, pantry: 5   },
  produce:    { fridge: 10,  freezer: 365, pantry: 5   },
  bread:      { fridge: 14,  freezer: 90,  pantry: 7   },
  bakery:     { fridge: 14,  freezer: 90,  pantry: 5   },
  pasta:      { fridge: 730, freezer: 730, pantry: 730 },
  rice:       { fridge: 730, freezer: 730, pantry: 730 },
  grains:     { fridge: 365, freezer: 730, pantry: 365 },
  cereals:    { fridge: 365, freezer: 365, pantry: 365 },
  canned:     { fridge: 7,   freezer: 1095, pantry: 1095 },
  frozen:     { fridge: 7,   freezer: 365, pantry: 1   },
  beverages:  { fridge: 30,  freezer: 365, pantry: 365 },
  juice:      { fridge: 14,  freezer: 365, pantry: 365 },
  snacks:     { fridge: 180, freezer: 365, pantry: 180 },
  condiments: { fridge: 365, freezer: 365, pantry: 365 },
  sauces:     { fridge: 180, freezer: 365, pantry: 365 },
  spices:     { fridge: 730, freezer: 730, pantry: 730 },
  oils:       { fridge: 365, freezer: 365, pantry: 365 },
  nuts:       { fridge: 180, freezer: 365, pantry: 90  },
  chocolate:  { fridge: 365, freezer: 730, pantry: 365 },
  sweets:     { fridge: 180, freezer: 365, pantry: 180 },
};

const DEFAULTS: ShelfLifeByLocation = { fridge: 14, freezer: 365, pantry: 30 };

const OFB_CATEGORY_MAP: Array<[RegExp, string]> = [
  [/dairy|milk|cream|fromage|cheese|yogurt|butter/i,   'dairy'],
  [/egg/i,                                              'eggs'],
  [/meat|beef|pork|lamb|veal|deli/i,                   'meat'],
  [/poultry|chicken|turkey|duck/i,                     'poultry'],
  [/fish|salmon|tuna|cod|seafood|shellfish/i,           'fish'],
  [/fruit|berr|apple|orange|banana|grape|melon/i,       'fruits'],
  [/vegetable|veggie|salad|greens|spinach|carrot/i,     'vegetables'],
  [/bread|bakery|biscuit|cracker|pastry/i,              'bread'],
  [/pasta|noodle|spaghetti|macaroni/i,                  'pasta'],
  [/rice|grain|quinoa|oat|cereal/i,                     'cereals'],
  [/canned|tinned|conserv/i,                            'canned'],
  [/frozen/i,                                           'frozen'],
  [/beverage|drink|juice|water|soda|coffee|tea/i,       'beverages'],
  [/snack|chip|crisp|popcorn/i,                         'snacks'],
  [/sauce|condiment|ketchup|mustard|mayo/i,             'condiments'],
  [/spice|herb|seasoning/i,                             'spices'],
  [/oil|vinegar/i,                                      'oils'],
  [/nut|almond|cashew|peanut|walnut/i,                  'nuts'],
  [/chocolate|candy|sweet|confection/i,                 'sweets'],
];

function matchCategory(ofbCategories: string[]): string | null {
  const combined = ofbCategories.join(' ').toLowerCase();
  for (const [pattern, key] of OFB_CATEGORY_MAP) {
    if (pattern.test(combined)) return key;
  }
  return null;
}

export function predictShelfLife(
  ofbCategories: string[],
  location: StorageLocation
): number {
  const matched = matchCategory(ofbCategories);
  const table = matched ? (CATEGORY_SHELF_LIFE[matched] ?? DEFAULTS) : DEFAULTS;
  return (table as unknown as Record<string, number>)[location] ?? table.pantry;
}

export function predictShelfLifeCategory(ofbCategories: string[]): string | null {
  return matchCategory(ofbCategories);
}
