/**
 * PiercingConfig — Realistic Navel Piercing Studio Catalog & Physical Properties
 */

export const DEBUG = false;

export const NAVEL_DESIGNS = [
  {
    id: 'diamond_solitaire',
    name: '💎 Diamond Solitaire',
    metal: 'silver',
    topGem: 'diamond',
    charm: 'diamond_drop',
    dangleLength: 1.25,
    mass: 1.0,
    gemColor: '#e0f2fe',
    description: '14K White Gold with brilliant cut diamond solitaire drop'
  },
  {
    id: 'luxury_gold',
    name: '🌟 18K Luxury Gold',
    metal: 'gold',
    topGem: null,
    charm: 'gold_ball',
    dangleLength: 1.0,
    mass: 0.8,
    gemColor: '#fef08a',
    description: 'Solid 18K polished yellow gold curved barbell'
  },
  {
    id: 'crystal_heart',
    name: '💖 Rose Gold Heart',
    metal: 'rosegold',
    topGem: 'crystal',
    charm: 'heart',
    dangleLength: 1.35,
    mass: 1.2,
    gemColor: '#f472b6',
    description: 'Rose gold curved ring with pavé crystal heart charm'
  },
  {
    id: 'opal_lotus',
    name: '🌸 Opal Lotus Drop',
    metal: 'silver',
    topGem: 'opal',
    charm: 'lotus',
    dangleLength: 1.45,
    mass: 1.3,
    gemColor: '#a7f3d0',
    description: 'Platinum filigree lotus blossom with iridescent opal'
  },
  {
    id: 'emerald_royal',
    name: '🟢 Emerald Crown',
    metal: 'gold',
    topGem: 'emerald',
    charm: 'emerald_drop',
    dangleLength: 1.3,
    mass: 1.1,
    gemColor: '#10b981',
    description: '18K Yellow Gold with royal teardrop emerald jewel'
  },
  {
    id: 'celestial_star',
    name: '✨ Celestial Star',
    metal: 'silver',
    topGem: 'diamond',
    charm: 'star',
    dangleLength: 1.35,
    mass: 1.0,
    gemColor: '#fde047',
    description: 'Gleaming white gold 5-point star with micro-pavé center'
  },
  {
    id: 'obsidian_titanium',
    name: '🖤 Black Titanium',
    metal: 'black',
    topGem: null,
    charm: 'obsidian_drop',
    dangleLength: 1.2,
    mass: 0.9,
    gemColor: '#6b7280',
    description: 'Anodized black titanium curved barbell with onyx drop'
  }
];

export const METAL_PALETTES = {
  silver: {
    edge: '#1e293b',
    darkMid: '#475569',
    mid: '#cbd5e1',
    sheen: '#f1f5f9',
    highlight: '#ffffff',
    ambientShadow: 'rgba(0, 0, 0, 0.45)'
  },
  gold: {
    edge: '#451a03',
    darkMid: '#854d0e',
    mid: '#eab308',
    sheen: '#fef08a',
    highlight: '#ffffff',
    ambientShadow: 'rgba(35, 18, 0, 0.48)'
  },
  rosegold: {
    edge: '#4c0519',
    darkMid: '#9f1239',
    mid: '#fb7185',
    sheen: '#ffe4e6',
    highlight: '#ffffff',
    ambientShadow: 'rgba(40, 10, 20, 0.45)'
  },
  black: {
    edge: '#09090b',
    darkMid: '#18181b',
    mid: '#3f3f46',
    sheen: '#71717a',
    highlight: '#e4e4e7',
    ambientShadow: 'rgba(0, 0, 0, 0.6)'
  }
};

export const GEM_PALETTES = {
  diamond: {
    base: '#f0fdf4',
    inner: '#bae6fd',
    deep: '#38bdf8',
    highlight: '#ffffff',
    edge: '#93c5fd'
  },
  crystal: {
    base: '#faf5ff',
    inner: '#f3e8ff',
    deep: '#c084fc',
    highlight: '#ffffff',
    edge: '#e9d5ff'
  },
  opal: {
    base: '#f0fdfa',
    inner: '#99f6e4',
    deep: '#2dd4bf',
    highlight: '#ffffff',
    edge: '#5eead4'
  },
  emerald: {
    base: '#ecfdf5',
    inner: '#34d399',
    deep: '#059669',
    highlight: '#d1fae5',
    edge: '#047857'
  }
};
