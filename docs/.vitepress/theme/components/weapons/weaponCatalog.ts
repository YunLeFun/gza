import { ITEM_CATALOG } from '../items/itemCatalog';
// Derive identity, names, modes and tuning descriptions from the existing game-backed catalog.
export const WEAPON_CATALOG = ITEM_CATALOG.filter(item => item.category === '武器')
  .sort((a, b) => Number(a.id === 'weapon:smg' || a.id === 'weapon:shotgun') - Number(b.id === 'weapon:smg' || b.id === 'weapon:shotgun'));
export const weaponEnglishNames: Record<string, string> = {
  broom: 'Broom', umbrella: 'Umbrella', 'frying-pan': 'Frying pan', 'pot-lid': 'Pot lid',
  'feather-duster': 'Feather duster', 'gas-cylinder': 'Gas cylinder', slingshot: 'Slingshot', smg: 'SMG', shotgun: 'Shotgun',
};
