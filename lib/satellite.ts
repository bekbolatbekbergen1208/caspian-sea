export const browseLayers = [
  {
    id: "terra",
    title: "Terra / MODIS",
    layer: "MODIS_Terra_CorrectedReflectance_TrueColor",
    resolution: "250 m",
    matrix: "GoogleMapsCompatible_Level9",
    maxzoom: 9,
  },
  {
    id: "aqua",
    title: "Aqua / MODIS",
    layer: "MODIS_Aqua_CorrectedReflectance_TrueColor",
    resolution: "250 m",
    matrix: "GoogleMapsCompatible_Level9",
    maxzoom: 9,
  },
  {
    id: "viirs",
    title: "NOAA-20 / VIIRS",
    layer: "VIIRS_NOAA20_CorrectedReflectance_TrueColor",
    resolution: "250 m browse / 375–750 m sensor",
    matrix: "GoogleMapsCompatible_Level9",
    maxzoom: 9,
  },
];
export function browseTiles(layer: string, day: string) {
  return `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/${layer}/default/${day}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`;
}
export function completeBrowseDay(latest: string) {
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  return latest < yesterday ? latest : yesterday;
}
