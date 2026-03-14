window.DOOMSDAY_MODEL = {
  eightPoundPint: 8,
  regionModels: [
    { key: 'gb', label: 'UK average', multiplier: 1.0, mapX: 60, mapY: 86 },
    {
      key: 'london-core',
      label: 'London core',
      multiplier: 1.35,
      matcher: {
        type: 'circle',
        centerLat: 51.5072,
        centerLng: -0.1276,
        radiusKm: 15
      },
      mapX: 72,
      mapY: 72
    },
    {
      key: 'london-orbit',
      label: 'London orbit',
      multiplier: 1.27,
      matcher: {
        type: 'circle',
        centerLat: 51.5072,
        centerLng: -0.1276,
        radiusKm: 38
      },
      mapX: 74,
      mapY: 78
    },
    { key: 'northern-ireland', label: 'Northern Ireland', multiplier: 0.96, bounds: { minLat: 54.0, maxLat: 55.45, minLng: -8.35, maxLng: -5.25 }, mapX: 18, mapY: 40 },
    { key: 'scotland', label: 'Scotland', multiplier: 1.05, bounds: { minLat: 54.55, maxLat: 60.95, minLng: -8.15, maxLng: -0.45 }, mapX: 52, mapY: 13 },
    { key: 'wales', label: 'Wales', multiplier: 0.93, bounds: { minLat: 51.3, maxLat: 53.55, minLng: -5.75, maxLng: -2.45 }, mapX: 39, mapY: 58 },
    { key: 'north-east', label: 'North East', multiplier: 0.95, bounds: { minLat: 54.45, maxLat: 55.85, minLng: -2.7, maxLng: -0.75 }, mapX: 69, mapY: 34 },
    { key: 'north-west', label: 'North West', multiplier: 1.01, bounds: { minLat: 53.15, maxLat: 55.45, minLng: -3.75, maxLng: -1.95 }, mapX: 49, mapY: 40 },
    { key: 'yorkshire-humber', label: 'Yorkshire and the Humber', multiplier: 0.99, bounds: { minLat: 53.25, maxLat: 54.85, minLng: -2.35, maxLng: 0.25 }, mapX: 62, mapY: 44 },
    { key: 'east-midlands', label: 'East Midlands', multiplier: 0.97, bounds: { minLat: 52.45, maxLat: 53.8, minLng: -1.95, maxLng: 0.45 }, mapX: 62, mapY: 56 },
    { key: 'west-midlands', label: 'West Midlands', multiplier: 0.98, bounds: { minLat: 51.8, maxLat: 53.35, minLng: -3.25, maxLng: -1.1 }, mapX: 50, mapY: 56 },
    { key: 'east-of-england', label: 'East of England', multiplier: 1.08, bounds: { minLat: 51.55, maxLat: 53.55, minLng: -0.85, maxLng: 1.85 }, mapX: 77, mapY: 58 },
    { key: 'south-west', label: 'South West', multiplier: 1.04, bounds: { minLat: 49.85, maxLat: 51.85, minLng: -6.6, maxLng: -1.45 }, mapX: 32, mapY: 77 },
    { key: 'south-east', label: 'South East', multiplier: 1.12, bounds: { minLat: 50.65, maxLat: 51.95, minLng: -1.9, maxLng: 1.55 }, mapX: 69, mapY: 79 }
  ],
  venueModels: [
    { key: 'standard', label: 'Neighbourhood pub', multiplier: 1.0 },
    { key: 'city-centre', label: 'City centre', multiplier: 1.12 },
    { key: 'tourist-hotspot', label: 'Tourist hotspot', multiplier: 1.25 },
    { key: 'travel-hub', label: 'Station / airport / stadium', multiplier: 1.35 }
  ]
};
