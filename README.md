# CaspianWatch AI

Каспий жағалауын шынайы спутниктік деректер арқылы зерттеуге арналған платформа. Әдепкі тіл — қазақша. NASA архивтік суреттері **ағымдағы өлшеу ретінде көрсетілмейді**. API жоқ кезде жалған статистика немесе DEMO өлшеуі шығарылмайды.

## Іске қосу

Node 22.13+ және Python 3.9+ керек (production үшін Python 3.12 ұсынылады).

```sh
npm install
cp .env.example .env.local
npm run dev
```

Preview мекенжайын терминал көрсетеді (әдетте `http://127.0.0.1:5173`). UI Next.js App Router / TypeScript қолданады; Sites-та орналастыру үшін Vinext және Cloudflare Workers адаптері бар. `npm run build` production жинағын құрады.

Python сервисі бөлек іске қосылады:

```sh
python3 -m venv .venv
.venv/bin/pip install -r backend/requirements.txt
.venv/bin/uvicorn main:app --app-dir backend --env-file .env.local --host 127.0.0.1 --port 8000
```

`.env.local` ішінде `COPERNICUS_CLIENT_ID`, `COPERNICUS_CLIENT_SECRET`, `GEO_API_KEY` мәндерін толтырыңыз. `GEO_API_KEY` — өзіңіз жасаған кездейсоқ серверлік құпия, екі сервисте бірдей болуы керек. Frontend серверіндегі `GEO_API_URL=http://127.0.0.1:8000` жергілікті Python сервисіне бағыттайды. Кілттерді Git-ке немесе браузерге жібермеңіз.

## Қосылымдар

- Copernicus: Sentinel Hub OAuth client credentials; ресми Catalog `/catalog/v1/search`, Processing `/process/v1`. Бұл OAuth client ID/secret, қарапайым тіркелгі құпиясөзі емес.
- Supabase: SQL редакторында `supabase/migrations/001_caspianwatch.sql` орындаңыз; `.env.local` ішінде URL, anon key және server-only service role key қосыңыз. Email/password Auth қосулы болуы керек. Email confirmation үшін Supabase URL configuration баптаңыз. `NEXT_PUBLIC_` мәндері build кезінде клиентке енгізіледі; өзгерсе қайта build/deploy керек.
- Gemini: `GEMINI_API_KEY` серверде. `GEMINI_MODEL` арқылы аккаунтқа қолжетімді модельді таңдауға болады.
- Жеке кабинет `/dashboard` тек кілттердің орнатылғанын көрсетеді; бұл API credentials жарамдылығын тексергенін білдірмейді.

## Ғылыми өңдеу

1. Нақты күндегі Sentinel-2 L2A каталог түсірілімдері тексеріледі.
2. B03/B08/B11/SCL/dataMask 10 м ортақ UTM торында алынады. Үлкен аймақ үшін ең көбі **10.24 × 10.24 км** полигон белгілеңіз; Ақтау әдепкі терезесі осы шекке сыяды.
3. NDWI `(B03-B08)/(B03+B08)` есептеледі. Шек UI-да таңдалады.
4. SCL 4/5/6 ғана сақталады; көлеңке, бұлт, қар, жарамсыз/жіктелмеген пиксельдер шығарылып тасталады.
5. Екі кезеңдегі ортақ жарамды аумақ + зерттеу полигоны ауданды шектейді. Проекцияда пиксель ауданы есептеледі.
6. Ашылған құрлық, су басқан аумақ, су аудандары, жарамды аумақ үлесі, MNDWI қосымша диагностикасы есептеледі. Су–құрлық көршілес пиксельдері WGS84 GeoJSON сызықтарына айналады; AOI шеті мен no-data шекаралары жағалау ретінде шығарылмайды.
7. Шекара аралығы — екі бағыттағы ең жақын шекараның медианалық қашықтығы. Бұл бағытталған шегіну немесе стандартты жағалау транsect өлшемі емес.
8. Шекараның бір пиксельдік сезімталдығы — статистикалық сенімділік интервалы емес. Далалық және көрнекі валидация қажет.

**Жағалау сызығының өзгерісі теңіз деңгейінің тікелей өлшемі емес.** 20 м SCL 10 м торға nearest-neighbor арқылы келтіріледі; оның бастапқы дәлдігі артпайды. Әртүрлі маусымдар мен аумақтардың нәтижелерін тікелей салыстырмаңыз.

Python NDWI модулі `backend/processing.py` ішінде бөлек орналасқан. Кейін ML классификаторын қосуға болады; ML нұсқасы бөлек ONNX сегментация модулі ретінде қосылды; негізгі аудан есебі — NDWI. GeoPandas/OpenCV/scikit-learn осы baseline үшін қажет емес және орнатылмаған.

## Нәтижені сақтау және экспорт

- `/compare`: NASA-ның 2006-09-29 / 2024-09-29 нақты архивтік жұбы кілтсіз салыстырылады. JPEG-тер тек көрнекі мақсатта; олардан аудан есептелмейді.
- Sentinel режимінде нақты күндерді таңдаңыз, суреттерді жүктеңіз және «Өзгерісті есептеу» басыңыз. Нақты түсірілім болмаған күнде басқа күнді таңдаңыз.
- NDWI тапсырмалары Python SQLite базасында сақталады, екі worker арқылы өңделеді. UI жұмыс күйін сұрап отырады. Сервер қайта іске қосылса аяқталмаған жұмыс `failed` болып, қайта жіберуді талап етеді. Ұзақ тапсырма жұмыс ID-імен `/api/jobs/{id}` арқылы тексеріледі.
- Есептелген нәтижелер браузерде уақытша сақталады. Supabase аккаунтына кіріп «Сақтау» бассаңыз, **сервер Python-нан қайта тексерген** нәтиже транзакциямен базаға жазылады. Өлшеулер, бастапқы scene ID-лер, геометриялар, алгоритм нұсқасы мен есептеу уақыты сақталады. Жағалау GeoJSON-ы жеке Storage bucket-ке жүктеледі.
- Қолданушы өз draft зерттеуін өңдеуге жібере алады; салыстыру бетіне жобадан өтсе, нәтиже сол жобаға сақталады.
- `/analytics`: база мен осы браузердегі есептеулер, аумақ бойынша сүзгі, график, CSV және GeoJSON.
- PDF есеп батырмасы браузердің басып шығару терезесін ашады; **Save as PDF** таңдаңыз. Есепте дереккөз, күндер, әдіс және шектеулер бар. Серверлік PDF генераторы орнатылмаған.
- Caspian AI тек пайдаланушының базада сақталған өлшеулерінің қысқаша сандық контекстін алады. Геометриялар AI провайдеріне жіберілмейді. Сандық дерек болмағанын көрсету нұсқаулығы берілген; LLM жауаптарын ғылыми қорытындыға дейін тексеру қажет.

## Тестілеу

```sh
npx tsc --noEmit
.venv/bin/python -m pytest -q
npm run build
```

Python тесттеріндегі синтетикалық деректер тек тест fixture-лері; UI-ға DEMO немесе нақты дерек ретінде жіберілмейді. Тесттер NDWI, бұлт/көлеңке фильтрі, аудан, AOI, ортақ жарамды маска, бос қамту, дұрыс CRS, жалған жағалау шетінен қорғаныс және API аутентификациясын тексереді.

## Кезеңдер және тексеру

| Кезең | Кодта дайын                                                                                               | Қосылым / нақты тексеру                                                                                        |
| ----- | --------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| 1     | 13 маршрут, дизайн, responsive CSS, dark/light, NASA және Wikimedia галереясы, MapLibre / OSM / NASA GIBS | Браузерде `/`, `/gallery`, `/explorer`; карта үшін интернет пен WebGL қажет                                    |
| 2     | Copernicus OAuth, Catalog, Processing, 3 спектрлік қабат, метадеректер, серверлік cache/retry             | Copernicus кілттерін енгізіп `/explorer` іздеу; осы ортада live API кілттері берілмеген                        |
| 3     | NDWI/SCL/MNDWI, UTM grid, полигон, салыстыру, GeoJSON, аудандар, қашықтық, quality/sensitivity            | Python тесттері; нақты Sentinel-2 есептеуі кілттермен және сервиспен тексерілуі керек                          |
| 4     | Supabase PostGIS/RLS SQL, Auth, draft жобалар, verified save, Storage, графиктер, CSV/GeoJSON/print-PDF   | Supabase жоба деректері жоқ, миграция нақты базада орындалмаған; қосқаннан кейін екі аккаунтпен RLS тексеріңіз |
| 5     | Gemini endpoint, үш тілдегі жауап сұрауы, база нәтижелерін шектелген контекстке қосу                      | Gemini key жоқ; live жауап және ғылыми фактілерді тексеру қажет. Автоматты кестелік AI есептері әлі жоқ        |
| 6     | TypeScript/build және ғылыми/API unit tests; Sites-та жеке web deployment                                 | Python сервисін HTTPS хостқа орналастыру, live интеграциялар мен далалық ғылыми валидация әлі қажет            |

Үш тілдегі негізгі интерфейс, навигация, басқару және ғылыми әдістеме бар. Сыртқы API қателері мен кейбір ғылыми есеп мәтіндері қазақша; толық редакциялық RU/EN аудармасы кейін кеңейтіледі.

## Production deployment

Веб-бөлігі Sites-та жеке қолжетімділікпен жарияланады. Нақты есептеу үшін Python сервисін бөлек контейнер ретінде орналастырыңыз:

```sh
docker build -t caspianwatch-geo backend
# Runtime credentials are passed as environment, never built into the image.
docker run --env-file .env.local -e DATA_DIR=/data -v caspianwatch-data:/data -p 8000:8000 caspianwatch-geo
```

Хостта HTTPS reverse proxy және тұрақты `/data` volume орнатыңыз. Sites runtime мәндеріне қолжетімді HTTPS `GEO_API_URL` және құпия `GEO_API_KEY` енгізіңіз. Cloudflare Workers Python геокеңістіктік кітапханаларын орындамайды. Көп instance үшін SQLite орнына орталық job queue/database қажет. Ағымдағы rate limit пен каталог cache isolate/process ішінде, distributed rate limiter емес.

## Суреттердің шығу тегі

- `caspian.jpg`: Aqua/MODIS, 2010-06-04, NASA Earth Observatory: https://science.nasa.gov/earth/earth-observatory/caspian-sea-44253/
- `north-2006.jpg` / `north-2024.jpg`: Terra/MODIS, 2006-09-29 / 2024-09-29, NASA GSFC: https://modis.gsfc.nasa.gov/gallery/individual.php?db_date=2024-10-08
- `dardzha.jpg`: Landsat 7, 2000-06-16, NASA/USGS: https://science.nasa.gov/earth/earth-observatory/dardzha-peninsula-78076/
- `aktau.jpg`: IvarT, 2026-05-16, CC0: https://commons.wikimedia.org/wiki/File:On_the_Caspian_Sea_waterfront_in_Aktau,_Kazakhstan.jpg
- `aktau-moon.jpg`: Rassim, 2012-07-21, CC BY-SA 3.0: https://commons.wikimedia.org/wiki/File:Moon_above_the_Caspian_Sea_in_Aktau.JPG

`*-preview.jpg` — өлшемі/сапасы веб үшін азайтылған көшірмелер; галереяда түпнұсқалар ашылады. AI арқылы жасалған фотолар жоқ. NASA usage guideline және әр фотоның лицензиясы `/sources` / `/gallery` беттерінде көрсетіледі.

## 2026 деректері — жаңартылған нұсқа

- Басты бетте 2026-10-11 күніндегі NASA Terra/MODIS Каспий шолу суреті көрсетіледі; 2010 суреті галереяда архив ретінде сақталды.
- MapLibre-де NASA Terra, Aqua және NOAA-20 VIIRS қабаттарын және күнді таңдауға болады. Қолжетімді аралықтар NASA WMTS GetCapabilities метадеректерінен алынады. Әдепкі күн — соңғы толық күн; күндік қабат бір нақты түсірілім уақытын білдірмейді. Бір аумақта бұлт/дерек бос болуы мүмкін.
- `/compare` бетінде NASA суреттерін екі таңдалған күн бойынша бірдей шекарада кілтсіз салыстыруға және PNG жүктеуге болады. Бұл көрнекі салыстыру; спектрлік NDWI/аудан есебі жүргізілмейді.
- Copernicus OAuth кілттері болмаса `/api/scenes` ресми **public STAC** каталогын пайдаланады. 2026-10-11 Ақтау маңындағы Sentinel-2B 39TWJ тайлы және оның ресми quicklook-ы нақты тексерілді. Quicklook георастр орнына картаға бұрмаланып төселмейді; жеке preview ретінде ашылады. B03/B08 спектрлік өңдеуге бұрынғыдай кілттер және Python сервисі қажет.
- Галереяға 2026 NASA және Copernicus суреттері, нақты күн/тайл/дереккөз метадеректері қосылды.
- Дайын жағалау AI моделі: [CoastSeg SegFormer RGB 4-class](https://satelliteshorelines.github.io/CoastSeg/models/). Модель салмақтары ONNX түрінде қосылды; NDWI базалық өлшемін алмастырмайды. Каспийдегі дәлдігін валидациялау керек. Өлшеуге арналған сегментация моделі мен ғылыми түсіндіруге арналған Gemini — екі бөлек қызмет; өз LLM моделін басынан оқыту қажет емес.

Тексерілген жаңа маршруттар: `/api/browse-metadata` → 200, `/api/scenes` → 2026 нақты каталог нәтижелері, `/api/scene-preview` → JPEG, `/api/browse-image` → 2026 PNG. Қолданылған NASA және Copernicus серверлері кілтсіз жауап берді.

## CoastSeg SegFormer моделі қосылды

`/shoreline-ai` — дайын **CoastSeg SegFormer RGB v4** моделімен жұмыс істейтін жаңа бет. Ресми салмақтар: [Zenodo 14036903](https://doi.org/10.5281/zenodo.14036903), Daniel Buscombe, CC BY 4.0. Релиздің v4 салмақтары checksum тексеруімен жүктеліп, ONNX форматына экспортталды. Бұл жоба релиздегі `BEST_MODEL` v2 моделін қолданбайды.

### Кілтсіз браузерлік inference

- Нақты ONNX салмақтары `public/models/coastseg-rgb.onnx` ішінде (шамамен 14.5 MiB).
- ONNX Runtime Web 1.20.1 WebAssembly CPU арқылы **Web Worker-де** орындалады. UI ағыны ұзақ есептеумен бөгелмейді; тоқтату батырмасы worker-ді аяқтайды.
- Алғашқы жүктеу ONNX + WASM файлдарын алады. SHA-256 manifest-пен тексеріледі. API кілті, Gemini және Python сервисі қажет емес.
- RGB 512×512 өлшемге bilinear resize арқылы келтіріліп, барлық RGB пиксельдерінің орташа мәні және adjusted population standard deviation бойынша нормаланады. Бұл CoastSeg RGB preprocessing әдісін қайталайды; браузердің bilinear интерполяциясы Pillow-мен биттік бірдей болмауы мүмкін.
- Төрт класс: су, толқын, шөгінді, басқа құрлық. Маска мөлдірлігі реттеледі; PNG маскасы және бастапқы дерек/модель/hash/класс белгілері бар JSON экспортталады.
- `/explorer` ішінде ашық Sentinel-2 preview-ын таңдағаннан кейін «Осы суретті AI моделіне беру» батырмасын басыңыз. Жеке AI бетінде сол ресми 2026-10-11 quicklook әдепкі ретінде ашылады. Жергілікті спутниктік RGB файлды да таңдауға болады; ол сыртқы сервиске жіберілмейді.
- JPEG preview сегментациясы **сапалық**: км², метрлік шегіну және теңіз деңгейі есептелмейді. Класс үлестері — тек жіктелген 512×512 сурет пиксельдерінің үлесі, географиялық аудан емес. Бұлттарда SCL жоқ. Модельдің Каспий жағалауының нақты дәлдігі әлі өлшенбеген.

### Нақты спектрлік деректермен NDWI / AI салыстыру

`/compare` → Sentinel-2 режиміндегі **NDWI + SegFormer** опциясы Python сервисіне `ml_compare=true` жібереді. Бұл бұрынғы Copernicus және GEO кілттерін талап етеді.

Python сервисіне қосымша:

```sh
.venv/bin/pip install -r backend/requirements-ml.txt
```

`ML_MODEL_PATH` — `coastseg-rgb.onnx` жолы; оның жанында `coastseg-rgb.json` болуы керек. Екі кезеңнің B04/B03/B02 арналарынан RGB жасалып, модельге беріледі. NDWI-мен салыстыру тек ортақ AOI/SCL жарамды пиксельдерінде жүргізіледі. Сәйкестік үлесі мен су жіктеуінің келіспейтін ауданы есептеледі. **Бұл модельдің ground-truth дәлдігі емес.** RGB 2.5× reflectance визуализациясы мен 512 resize-ының ықпалы шектеулерде жазылады.

Docker-де қосымша ML тәуелділіктері:

```sh
docker build --build-arg WITH_ML=true -t caspianwatch-geo backend
# Mount the exported ONNX and manifest, and override ML_MODEL_PATH=/models/coastseg-rgb.onnx.
```

### Тексеру және экспортты қайталау

```sh
.venv/bin/pip install -r backend/requirements-ml.txt
.venv/bin/python scripts/prepare-model-qa.py
node scripts/verify-model-web.mjs
node scripts/verify-worker.mjs
.venv/bin/python -m pytest -q
```

Тексерілген ресми Sentinel quicklook-та TensorFlow / ONNX және native ONNX / WASM арасындағы бастапқы 128×128 класс белгілері бірдей болды; logits айырмасы шамамен 0.000004. Нақты worker модельді жүктеп, checksum тексеріп, 512×512 маска қайтарды. **Бұл — орындалу нұсқаларының сәйкестігі, модельдің 100% ғылыми дәлдігі емес.** Браузердегі визуалды UI тексеруі computer-use шектеуіне байланысты аяқталмады.

Модельді қайта экспорттау үшін `backend/requirements-ml-export.txt` тәуелділіктері және түпнұсқа `models/coastseg/Global_4class_rgb_512_v4_segformer.h5` қажет. Файлдың MD5: `d8fea34db908f9924a8dbaac7a479e3a`. `scripts/export-coastseg.py` салмақтарды қатаң жүктеп, ONNX логиттерін TensorFlow-мен салыстырады. Түпнұсқа H5 Git-ке кірмейді; сайтқа inference үшін тек ONNX және manifest жеткілікті.

## English interface and date forecasts

The platform now uses English throughout its navigation, reports, provider errors and metadata. `/forecast` fits an exploratory linear water-area trend to at least four distinct observations spanning 30 days. Series require identical AOI geometry, algorithm, projection, resolution and threshold and 100% jointly valid coverage. It excludes conflicting repeats and observations on or after the target date. The maximum horizon is one training span, capped at 365 days. No numerical forecast is fabricated when measurements are unavailable. This is not a validated hydrological or sea-level model; residual spread and boundary sensitivity are not confidence intervals. Run `node scripts/test-forecast.mjs` for the forecast checks. Browser visual verification remains unavailable in the current session.
