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

Python NDWI модулі `backend/processing.py` ішінде бөлек орналасқан. Кейін ML классификаторын қосуға болады; қазіргі нұсқада ML қолданылғаны туралы мәлімделмейді. GeoPandas/OpenCV/scikit-learn осы baseline үшін қажет емес және орнатылмаған.

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
| 1     | 12 маршрут, дизайн, responsive CSS, dark/light, NASA және Wikimedia галереясы, MapLibre / OSM / NASA GIBS | Браузерде `/`, `/gallery`, `/explorer`; карта үшін интернет пен WebGL қажет                                    |
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
