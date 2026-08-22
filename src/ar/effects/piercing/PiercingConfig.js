/**
 * PiercingConfig — Navel / Belly Button Piercing Studio Design Catalogue
 */

export const DEBUG = false; // Set to true if live landmark coordinates debug overlay is needed

export const NAVEL_DESIGNS = [
  {
    id: 'diamond_solitaire',
    name: 'Diamond Solitaire',
    metal: 'silver',
    topGem: 'diamond',
    charm: 'diamond_drop',
    gemColor: '#e0f2fe',
    description: 'Brilliant cut diamond solitaire with curved platinum barbell'
  },
  {
    id: 'luxury_gold',
    name: '18K Luxury Gold',
    metal: 'gold',
    topGem: null,
    charm: 'gold_ball',
    gemColor: '#fef08a',
    description: 'Polished 18K solid yellow gold curved barbell'
  },
  {
    id: 'crystal_heart',
    name: 'Rose Gold Heart',
    metal: 'rosegold',
    topGem: 'crystal',
    charm: 'heart',
    gemColor: '#f472b6',
    description: 'Rose gold curved ring with pavé crystal heart charm'
  },
  {
    id: 'opal_lotus',
    name: 'Opal Lotus Drop',
    metal: 'silver',
    topGem: 'opal',
    charm: 'lotus',
    gemColor: '#a7f3d0',
    description: 'Ethereal iridescent opal cluster with hanging lotus blossom'
  },
  {
    id: 'emerald_royal',
    name: 'Emerald Crown',
    metal: 'gold',
    topGem: 'emerald',
    charm: 'emerald_drop',
    gemColor: '#10b981',
    description: 'Deep emerald jewel with regal filigree gold setting'
  },
  {
    id: 'celestial_star',
    name: 'Celestial Star',
    metal: 'silver',
    topGem: 'diamond',
    charm: 'star',
    gemColor: '#fde047',
    description: 'Gleaming five-point star charm with radiant crystal center'
  },
  {
    id: 'obsidian_titanium',
    name: 'Black Titanium',
    metal: 'black',
    topGem: null,
    charm: 'obsidian_drop',
    gemColor: '#6b7280',
    description: 'Anodized black titanium curved barbell with dark onyx drop'
  }
];

export const METAL_PALETTES = {
  silver: {
    edge: '#334155',
    darkMid: '#64748b',
    mid: '#cbd5e1',
    sheen: '#f1f5f9',
    highlight: '#ffffff',
    shadow: 'rgba(0, 0, 0, 0.4)'
  },
  gold: {
    edge: '#713f12',
    darkMid: '#a16207',
    mid: '#eab308',
    sheen: '#fef08a',
    highlight: '#ffffff',
    shadow: 'rgba(50, 30, 0, 0.45)'
  },
  rosegold: {
    edge: '#881337',
    darkMid: '#be123c',
    mid: '#fb7185',
    sheen: '#ffe4e6',
    highlight: '#ffffff',
    shadow: 'rgba(60, 10, 20, 0.4)'
  },
  black: {
    edge: '#09090b',
    darkMid: '#18181b',
    mid: '#3f3f46',
    sheen: '#71717a',
    highlight: '#d4d4d8',
    shadow: 'rgba(0, 0, 0, 0.6)'
  }
};

export const GEM_PALETTES = {
  diamond: {
    base: '#f0fdf4',
    inner: '#bae6fd',
    deep: '#38bdf8',
    highlight: '#ffffff',
    sparkle: '#ffffff',
    edge: '#93c5fd'
  },
  crystal: {
    base: '#faf5ff',
    inner: '#f3e8ff',
    deep: '#c084fc',
    highlight: '#ffffff',
    sparkle: '#ffffff',
    edge: '#e9d5ff'
  },
  opal: {
    base: '#f0fdfa',
    inner: '#99f6e4',
    deep: '#2dd4bf',
    highlight: '#ffffff',
    sparkle: '#ccfbf1',
    edge: '#5eead4'
  },
  emerald: {
    base: '#ecfdf5',
    inner: '#34d399',
    deep: '#059669',
    highlight: '#d1fae5',
    sparkle: '#ffffff',
    edge: '#047857'
  }
};
