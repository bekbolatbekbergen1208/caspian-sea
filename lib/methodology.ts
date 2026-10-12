import { Lang } from "./i18n";
export const methodology: Record<Lang, [string, string][]> = {
  kk: [
    [
      "Зерттеу мәселесі",
      "Белгіленген Каспий жағалауында байқалған су–құрлық шекарасы екі кезең арасында қалай өзгерді? Бұл теңіз деңгейінің тікелей өлшемі емес.",
    ],
    [
      "Ғылыми гипотеза",
      "Бір маусымдағы жіктелген су ауданының азаюы құрлықтың ашылуымен байланысты болуы мүмкін. Жел, лайлылық, бұлт және жіктеу қатесі — балама түсіндірмелер.",
    ],
    [
      "Қолданылған деректер",
      "Sentinel-2 Level-2A: B03 (жасыл), B08 (жақын инфрақызыл), B11 (SWIR), SCL және dataMask. Әр нақты күндегі каталог түсірілімдері тексеріледі. Барлық бастапқы тайл ID-лері нәтижеде сақталады.",
    ],
    [
      "Әдіс",
      "NDWI = (Green − NIR) / (Green + NIR). NDWI таңдалған шектен жоғары болса — су. SCL 4, 5, 6 кластары сақталады; бұлт, көлеңке, қар және жарамсыз пиксельдер алынып тасталады. SCL мен B11 10 м торға nearest-neighbor арқылы келтіріледі. MNDWI тек қосымша диагностика ретінде есептеледі.",
    ],
    [
      "Аудан мен қашықтық",
      "Екі кезең бірдей 10 м UTM торында өңделеді. Аумақ полигоны мен екі кезеңнің ортақ жарамды маскасы барлық өлшемдерді шектейді. Су → құрлық — ашылған аумақ; құрлық → су — су басқан аумақ. Аумақ шеті және жарамсыз пиксель шекарасы жағалау сызығынан алынып тасталады. Қашықтық — екі бағыттағы ең жақын шекаралар арасы; ол бағытталған шегіну өлшемі емес.",
    ],
    [
      "Өлшеу дәлдігі",
      "Екі кезеңде де жарамды аумақ үлесі есептеледі. Бір пиксельдік су шекарасы жолағы сезімталдықты бағалайды. Бұл статистикалық сенімділік интервалы немесе толық қателік бюджеті емес. Қамту төмен болса, нәтиже белгіленеді.",
    ],
    [
      "Зерттеудің шектеулері",
      "10 м пиксель, 20 м SCL, геотіркеу, толқын, жел, тайыз су, лайлылық, шек мәні және маусымдық айырмашылық шекараны өзгерте алады. Көрнекі және далалық тексеру қажет.",
    ],
    [
      "Қорытынды",
      "Түсірілім ID-лері, күндер, проекция, шек, алгоритм нұсқасы және есептеу уақыты міндетті түрде сақталады. CoastSeg SegFormer қосымша жіктеуіш ретінде қосылды; негізгі аудан алгоритмі — NDWI. Жіктеуіштердің сәйкестігі ground-truth дәлдігі емес.",
    ],
  ],
  ru: [
    [
      "Исследовательский вопрос",
      "Как изменилась наблюдаемая граница воды и суши между двумя периодами в заданной области Каспия? Это не прямое измерение уровня моря.",
    ],
    [
      "Научная гипотеза",
      "Уменьшение классифицированной площади воды в одинаковый сезон может соответствовать новой суше. Ветровые нагоны, мутность, облачность и ошибка классификации — альтернативные объяснения.",
    ],
    [
      "Данные",
      "Sentinel-2 Level-2A: B03 (зелёный), B08 (ближний инфракрасный), B11 (SWIR), SCL и dataMask. Проверяются снимки каталога за каждый точный день. ID исходных тайлов сохраняются в результате.",
    ],
    [
      "Метод",
      "NDWI = (Green − NIR) / (Green + NIR). Вода определяется как NDWI выше выбранного порога. Сохраняются классы SCL 4, 5, 6; исключаются облака, тени, снег и недействительные пиксели. SCL и B11 приводятся к сетке 10 м методом ближайшего соседа. MNDWI используется только для дополнительной диагностики.",
    ],
    [
      "Площадь и расстояние",
      "Оба периода обрабатываются на единой сетке UTM 10 м. Полигон и совместная маска валидности ограничивают все измерения. Вода → суша означает новую сушу; суша → вода означает затопление. Границы области и no-data не считаются берегом. Расстояние — симметричная медиана ближайших границ, не направленное отступление по трансектам.",
    ],
    [
      "Точность измерений",
      "Рассчитывается доля области, действительной в обоих периодах. Полоса границы шириной в один пиксель оценивает чувствительность. Это не статистический доверительный интервал и не полный бюджет ошибок. Низкое покрытие отмечается в результате.",
    ],
    [
      "Ограничения",
      "Пиксели 10 м, SCL 20 м, геопривязка, волны, ветер, мелководье, мутность, порог классификации и различия сезонов влияют на обнаруженную границу. Необходимы визуальная и полевая проверки.",
    ],
    [
      "Вывод",
      "Сохраняйте ID снимков, даты, проекцию, порог, версию алгоритма и время расчёта. CoastSeg SegFormer подключён как дополнительный классификатор; базовый алгоритм площадей — NDWI. Совпадение классификаторов не является ground-truth точностью.",
    ],
  ],
  en: [
    [
      "Research question",
      "How did the observed water–land boundary change within a defined Caspian study area? This is not a direct measurement of sea level.",
    ],
    [
      "Hypothesis",
      "A decrease in classified water area between comparable seasons may correspond to exposed land. Wind setup, cloud, turbidity and classification error are alternative explanations.",
    ],
    [
      "Data",
      "Sentinel-2 Level-2A surface reflectance: B03 (green), B08 (near infrared), B11 (SWIR), SCL and dataMask. Available catalog scenes are checked on each exact day; provenance records all contributing tile IDs.",
    ],
    [
      "Method",
      "NDWI = (Green − NIR) / (Green + NIR). Water is NDWI above the selected threshold. SCL classes 4, 5 and 6 are retained; clouds, shadows, snow, defective and unclassified pixels are excluded. B11 and SCL are resampled to 10 m with nearest-neighbor. MNDWI is a diagnostic, not a replacement for NDWI.",
    ],
    [
      "Area and distance",
      "A common 10 m UTM grid is built for both dates. AOI and joint valid masks constrain every measurement. Water → land is exposed area; land → water is flooding. AOI and no-data edges are excluded from shoreline vectors. Displacement is symmetric median nearest-boundary distance, not signed transect retreat.",
    ],
    [
      "Quality and uncertainty",
      "Valid coverage is reported for the joint observation footprint. A one-pixel water-edge band gives boundary sensitivity. This is not a statistical confidence interval or a complete error budget. Low coverage is flagged.",
    ],
    [
      "Limitations",
      "10 m pixels, 20 m SCL, georegistration, waves, wind, shallow water, suspended sediment, threshold bias and seasonal differences can shift the detected boundary. Visual and field validation are required.",
    ],
    [
      "Conclusion",
      "Record scene IDs, dates, projection, threshold, algorithm version and processing time. Interpret results alongside quality flags. CoastSeg SegFormer is an optional classifier; area calculations use the NDWI baseline. Classifier agreement is not ground-truth accuracy.",
    ],
  ],
};
