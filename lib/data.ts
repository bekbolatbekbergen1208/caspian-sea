export const regions = [
  {
    id: "aktau",
    name: "Ақтау жағалауы",
    en: "Aktau coast",
    ru: "Побережье Актау",
    bbox: [51.1, 43.6, 51.18, 43.68] as number[],
    center: [51.15, 43.65] as [number, number],
    zoom: 11,
  },
  {
    id: "atyrau",
    name: "Атырау облысы",
    en: "Atyrau region",
    ru: "Атырауская область",
    bbox: [51.1, 46.7, 51.7, 47.1],
    center: [51.4, 46.9] as [number, number],
    zoom: 9,
  },
  {
    id: "north",
    name: "Солтүстік Каспий",
    en: "North Caspian",
    ru: "Северный Каспий",
    bbox: [47, 44, 54, 47.5],
    center: [50.5, 45.75] as [number, number],
    zoom: 6,
  },
  {
    id: "basin",
    name: "Каспий бассейні",
    en: "Caspian basin",
    ru: "Каспийский бассейн",
    bbox: [46, 36, 55, 48],
    center: [50.5, 42] as [number, number],
    zoom: 5,
  },
];
export const photos = [
  {
    id: "aktau",
    title: "Ақтау жағалауындағы серуен жолы",
    en: "Aktau waterfront",
    ru: "Набережная Актау",
    image: "/images/aktau.jpg",
    date: "2026-05-16",
    satellite: "Жерүсті фотосы / Ground photography",
    source: "Wikimedia Commons",
    url: "https://commons.wikimedia.org/wiki/File:On_the_Caspian_Sea_waterfront_in_Aktau,_Kazakhstan.jpg",
    credit: "IvarT",
    license: "CC0 1.0",
    licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
    description:
      "Ақтау жағалауындағы «Кеме» ескерткіші. Шынайы жерүсті фотосы; спутниктік өлшеу емес.",
    descriptionEn:
      "The Ship monument on the Aktau waterfront. Real ground photography, not satellite measurement.",
    descriptionRu:
      "Памятник «Корабль» на набережной Актау. Реальная наземная фотография, не спутниковое измерение.",
  },
  {
    id: "aktau-moon",
    title: "Ақтау жағалауындағы ай",
    en: "Moon above the Aktau coast",
    ru: "Луна над побережьем Актау",
    image: "/images/aktau-moon.jpg",
    date: "2012-07-21",
    satellite: "Жерүсті фотосы / Ground photography",
    source: "Wikimedia Commons",
    url: "https://commons.wikimedia.org/wiki/File:Moon_above_the_Caspian_Sea_in_Aktau.JPG",
    credit: "Rassim",
    license: "CC BY-SA 3.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0/",
    description: "Ақтаудағы Каспий теңізі. Өзгертілмеген авторлық фото.",
    descriptionEn: "The Caspian Sea at Aktau. Unmodified original photograph.",
    descriptionRu:
      "Каспийское море в Актау. Оригинальная фотография без изменений.",
  },
  {
    id: "caspian",
    title: "Каспий ғарыштан",
    en: "Caspian from space",
    ru: "Каспий из космоса",
    descriptionEn:
      "Natural-color Caspian basin. This archive image is not a current monitoring measurement.",
    descriptionRu:
      "Каспийский бассейн в естественных цветах. Архивный снимок не является текущим измерением.",
    image: "/images/caspian.jpg",
    date: "2010-06-04",
    satellite: "Aqua / MODIS",
    source: "NASA Earth Observatory",
    url: "https://science.nasa.gov/earth/earth-observatory/caspian-sea-44253/",
    credit: "NASA Earth Observatory, MODIS Rapid Response Team",
    description:
      "Табиғи түстердегі Каспий бассейні. Бұл архивтік сурет ағымдағы мониторинг өлшемі емес.",
  },
  {
    id: "north-2024",
    title: "Солтүстік Каспий · 2024",
    en: "North Caspian · 2024",
    ru: "Северный Каспий · 2024",
    descriptionEn:
      "Bands 7–2–1: water appears blue and vegetation bright green.",
    descriptionRu:
      "Каналы 7–2–1: вода показана синим, растительность ярко-зелёным.",
    image: "/images/north-2024.jpg",
    date: "2024-09-29",
    satellite: "Terra / MODIS",
    source: "NASA GSFC",
    url: "https://modis.gsfc.nasa.gov/gallery/individual.php?db_date=2024-10-08",
    credit: "MODIS Land Rapid Response Team, NASA GSFC",
    description:
      "7–2–1 спектрлік арналары: су көк түспен, өсімдік ашық жасыл түспен көрінеді.",
  },
  {
    id: "north-2006",
    title: "Солтүстік Каспий · 2006",
    en: "North Caspian · 2006",
    ru: "Северный Каспий · 2006",
    descriptionEn:
      "Earlier scene of the NASA archive comparison. Quantitative measurements require georeferenced spectral data.",
    descriptionRu:
      "Ранний снимок архивной пары NASA. Для количественных измерений нужны привязанные спектральные данные.",
    image: "/images/north-2006.jpg",
    date: "2006-09-29",
    satellite: "Terra / MODIS",
    source: "NASA GSFC",
    url: "https://modis.gsfc.nasa.gov/gallery/individual.php?db_date=2024-10-08",
    credit: "MODIS Land Rapid Response Team, NASA GSFC",
    description:
      "NASA жариялаған тарихи салыстыру жұбының бастапқы суреті. Сандық есептеуге бастапқы георастр қажет.",
  },
  {
    id: "dardzha",
    title: "Дарджа түбегі",
    en: "Dardzha peninsula",
    ru: "Полуостров Дарджа",
    descriptionEn:
      "A peninsula on the eastern Caspian coast, observed by Landsat in natural color.",
    descriptionRu:
      "Полуостров на восточном побережье Каспия в естественных цветах Landsat.",
    image: "/images/dardzha.jpg",
    date: "2000-06-16",
    satellite: "Landsat 7 / ETM+",
    source: "NASA Earth Observatory / USGS",
    url: "https://science.nasa.gov/earth/earth-observatory/dardzha-peninsula-78076/",
    credit: "Jesse Allen and Robert Simmon, Landsat data / USGS",
    description:
      "Шығыс Каспий жағалауындағы түбек, табиғи түстердегі Landsat түсірілімі.",
  },
];
export type Analysis = {
  id: string;
  created_at: string;
  algorithm: string;
  region: string;
  before: string;
  after: string;
  before_scene: string;
  after_scene: string;
  exposed_km2: number;
  flooded_km2: number;
  valid_fraction: number;
  resolution_m: number;
  uncertainty_km2: number;
  displacement_m: number | null;
  shoreline: any;
  water_before_km2: number;
  water_after_km2: number;
  threshold: number;
  projection: string;
  limitations: string[];
};
export const sources = [
  [
    "Copernicus Data Space",
    "Sentinel-2 L2A · Catalog, Process, OAuth2",
    "https://documentation.dataspace.copernicus.eu/APIs/SentinelHub/Overview.html",
  ],
  [
    "NASA Earth Observatory",
    "Архивтік суреттер және түсірілім метадеректері",
    "https://science.nasa.gov/earth/earth-observatory/",
  ],
  [
    "NASA MODIS",
    "Солтүстік Каспийдің 2006 / 2024 салыстыру жұбы",
    "https://modis.gsfc.nasa.gov/gallery/individual.php?db_date=2024-10-08",
  ],
  [
    "OpenStreetMap",
    "Базалық карта · © OpenStreetMap contributors · ODbL",
    "https://www.openstreetmap.org/copyright",
  ],
  [
    "NASA пайдалану шарттары",
    "NASA материалдарына арналған медиа нұсқаулығы; авторлық атрибуция сақталады",
    "https://www.nasa.gov/nasa-brand-center/images-and-media/",
  ],
];
