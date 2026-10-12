"use client";
import { useEffect, useRef, useState } from "react";
import {
  BrainCircuit,
  Download,
  Play,
  Square,
  Upload,
  ShieldCheck,
  ExternalLink,
} from "lucide-react";
import { Lang } from "@/lib/i18n";
const text = {
  kk: {
    title: "AI жағалау сегментациясы",
    intro: "Дайын CoastSeg SegFormer моделі. Есептеу браузерде орындалады.",
    run: "Модельді іске қосу",
    stop: "Тоқтату",
    upload: "Басқа RGB суретті таңдау",
    loading: "Модель жүктелуде…",
    running: "Сурет төрт класқа бөлінуде…",
    empty: "Нәтиже модель іске қосылғаннан кейін пайда болады.",
    water: "Су",
    whitewater: "Толқын",
    sediment: "Шөгінді",
    other: "Басқа құрлық",
    opacity: "Қабат мөлдірлігі",
    notice:
      "Бұл — RGB суреттегі AI жіктеуі. JPEG preview-да геотрансформация және SCL маскасы жоқ: аудан, метрлік жағалау өзгерісі немесе теңіз деңгейі есептелмейді. Модельдің Каспийдегі дәлдігі әлі валидацияланбаған.",
    sample: "Sentinel-2B · 39TWJ · 11.10.2026 · ресми quicklook",
    local: "Сурет сыртқы AI сервисіне жіберілмейді.",
    percent: "Жіктелген сурет пиксельдері",
    mask: "Маска PNG",
    report: "Нәтиже JSON",
  },
  ru: {
    title: "AI сегментация побережья",
    intro:
      "Готовая модель CoastSeg SegFormer. Вычисления выполняются в браузере.",
    run: "Запустить модель",
    stop: "Остановить",
    upload: "Выбрать другое RGB изображение",
    loading: "Загрузка модели…",
    running: "Классификация на четыре класса…",
    empty: "Результат появится после запуска модели.",
    water: "Вода",
    whitewater: "Прибой",
    sediment: "Осадочные породы",
    other: "Прочая суша",
    opacity: "Прозрачность слоя",
    notice:
      "Это AI классификация RGB изображения. У JPEG preview нет геотрансформации и SCL: площадь, изменение берега в метрах и уровень моря не рассчитываются. Точность модели на Каспии ещё не валидирована.",
    sample: "Sentinel-2B · 39TWJ · 11.10.2026 · официальный quicklook",
    local: "Изображение не отправляется внешнему AI сервису.",
    percent: "Классифицированные пиксели изображения",
    mask: "Маска PNG",
    report: "Результат JSON",
  },
  en: {
    title: "AI coastline segmentation",
    intro: "Pretrained CoastSeg SegFormer. Inference runs in your browser.",
    run: "Run model",
    stop: "Stop",
    upload: "Choose another RGB image",
    loading: "Loading model…",
    running: "Classifying four land-cover classes…",
    empty: "Run the model to generate a real prediction.",
    water: "Water",
    whitewater: "Whitewater",
    sediment: "Sediment",
    other: "Other land",
    opacity: "Layer opacity",
    notice:
      "This is RGB image classification. JPEG previews lack a geotransform and SCL mask: no area, metric shoreline change or sea level is calculated. Caspian accuracy has not been validated.",
    sample: "Sentinel-2B · 39TWJ · 11 Oct 2026 · official quicklook",
    local: "Your image is not sent to an external AI service.",
    percent: "Classified image pixels",
    mask: "Mask PNG",
    report: "Result JSON",
  },
};
type Result = {
  processed_at: string;
  rgba: Uint8ClampedArray;
  labels: Uint8Array;
  counts: number[];
  elapsed_ms: number;
  manifest: any;
};
export default function ShorelineModel({
  lang,
  imageUrl,
  sceneId,
}: {
  lang: Lang;
  imageUrl?: string;
  sceneId?: string;
}) {
  const generation = useRef(0);
  const t = text[lang],
    canvas = useRef<HTMLCanvasElement>(null),
    worker = useRef<Worker | null>(null),
    fileInput = useRef<HTMLInputElement>(null),
    timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [source, setSource] = useState(imageUrl || "/images/sentinel-2026.jpg"),
    [name, setName] = useState(sceneId || t.sample),
    [custom, setCustom] = useState<string>(),
    [result, setResult] = useState<Result | null>(null),
    [busy, setBusy] = useState(false),
    [stage, setStage] = useState(""),
    [error, setError] = useState(""),
    [opacity, setOpacity] = useState(0.55),
    [manifest, setManifest] = useState<any>(null);
  useEffect(() => {
    fetch("/models/coastseg-rgb.json")
      .then((r) => (r.ok ? r.json() : null))
      .then(setManifest)
      .catch(() => {});
  }, []);
  useEffect(() => {
    if (imageUrl) {
      stop();
      setSource(imageUrl);
      setName(sceneId || "Sentinel-2 RGB");
      setResult(null);
    }
  }, [imageUrl, sceneId]);
  useEffect(
    () => () => {
      worker.current?.terminate();
      if (timeout.current) clearTimeout(timeout.current);
    },
    [],
  );
  useEffect(
    () => () => {
      if (custom) URL.revokeObjectURL(custom);
    },
    [custom],
  );
  useEffect(() => {
    if (result && canvas.current) {
      const ctx = canvas.current.getContext("2d");
      ctx?.putImageData(
        new ImageData(new Uint8ClampedArray(result.rgba), 512, 512),
        0,
        0,
      );
    }
  }, [result]);
  function stop() {
    generation.current++;
    worker.current?.terminate();
    worker.current = null;
    if (timeout.current) clearTimeout(timeout.current);
    setBusy(false);
    setStage("");
  }
  async function run() {
    const token = ++generation.current;
    setError("");
    setBusy(true);
    setResult(null);
    setStage("loading");
    try {
      const image = new Image();
      image.src = source;
      await image.decode();
      if (token !== generation.current) return;
      const input = document.createElement("canvas");
      input.width = 512;
      input.height = 512;
      const ctx = input.getContext("2d", { willReadFrequently: true });
      if (!ctx) throw new Error("Canvas unavailable");
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(image, 0, 0, 512, 512);
      const rgba = ctx.getImageData(0, 0, 512, 512).data;
      if (!worker.current) {
        worker.current = new Worker("/segmentation-worker.js", {
          type: "module",
        });
        worker.current.onmessage = (e) => {
          const message = e.data;
          if (message.type === "progress") setStage(message.stage);
          if (message.type === "result") {
            if (timeout.current) clearTimeout(timeout.current);
            setResult(message);
            setBusy(false);
            setStage("");
          }
          if (message.type === "error") {
            setError(message.message);
            stop();
          }
        };
        worker.current.onerror = (e) => {
          setError(e.message || "Model runtime could not start");
          stop();
        };
      }
      timeout.current = setTimeout(() => {
        setError(
          lang === "kk"
            ? "Есептеу 3 минуттан асты. Қуаттырақ құрылғыда қайталаңыз."
            : lang === "ru"
              ? "Расчёт превысил 3 минуты. Попробуйте более мощное устройство."
              : "Inference exceeded 3 minutes. Try a more capable device.",
        );
        stop();
      }, 180000);
      worker.current.postMessage({ type: "segment", rgba }, [rgba.buffer]);
    } catch (e) {
      setError((e as Error).message);
      stop();
    }
  }
  function choose(file: File | undefined) {
    if (!file) return;
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      file.size > 10 * 1024 * 1024
    ) {
      setError("JPEG / PNG / WebP, max 10 MB");
      return;
    }
    stop();
    const url = URL.createObjectURL(file);
    setCustom(url);
    setSource(url);
    setName(file.name);
    setResult(null);
    setError("");
  }
  function saveJSON() {
    if (!result) return;
    const record = {
      model: result.manifest.name,
      model_version: result.manifest.version,
      model_sha256: result.manifest.onnx_sha256,
      model_source: result.manifest.record,
      source_image: name,
      processed_at: result.processed_at,
      elapsed_ms: result.elapsed_ms,
      grid: [512, 512],
      classes: result.manifest.classes,
      pixel_counts: result.counts,
      labels: Array.from(result.labels),
      measurement_type: "qualitative_rgb_segmentation",
      area_km2: null,
      limitations: result.manifest.limitations,
    };
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(record)], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "coastseg-prediction.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const names = [t.water, t.whitewater, t.sediment, t.other];
  return (
    <div className="model-lab">
      <div className="panel model-heading">
        <div>
          <span className="eyebrow">PRETRAINED SEGFORMER · 4 CLASSES</span>
          <h2>{t.title}</h2>
          <p>{t.intro}</p>
        </div>
        <span className="small-tag">LOCAL INFERENCE</span>
      </div>
      <div className="model-grid">
        <div className="panel model-image-panel">
          <div className="model-view">
            <img src={source} alt={name} />
            {result && (
              <canvas
                ref={canvas}
                width={512}
                height={512}
                style={{ opacity }}
              />
            )}
            {busy && (
              <div className="model-progress">
                <BrainCircuit size={30} />
                <span>{stage === "running" ? t.running : t.loading}</span>
              </div>
            )}
          </div>
          <div className="model-caption">{name}</div>
        </div>
        <aside className="panel model-controls">
          <div className="panel-title">
            <BrainCircuit size={20} />
            CoastSeg SegFormer RGB
          </div>
          <p className="model-description">{t.local}</p>
          <button className="button primary full" onClick={run} disabled={busy}>
            <Play size={16} />
            {t.run}
          </button>
          {busy && (
            <button className="button secondary full" onClick={stop}>
              <Square size={15} />
              {t.stop}
            </button>
          )}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            ref={fileInput}
            hidden
            onChange={(e) => choose(e.target.files?.[0])}
          />
          <button
            className="button secondary full"
            onClick={() => fileInput.current?.click()}
          >
            <Upload size={16} />
            {t.upload}
          </button>
          {result ? (
            <>
              <label className="field model-opacity">
                {t.opacity} · {Math.round(opacity * 100)}%
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={opacity}
                  onChange={(e) => setOpacity(+e.target.value)}
                />
              </label>
              <div className="model-classes">
                <small>{t.percent}</small>
                {names.map((n, i) => (
                  <div key={n}>
                    <i className={"class-color class-" + i} />
                    <span>{n}</span>
                    <b>
                      {((result.counts[i] / (512 * 512)) * 100).toFixed(1)}%
                    </b>
                  </div>
                ))}
              </div>
              <div className="export-buttons">
                <button
                  className="button secondary"
                  onClick={() => {
                    const a = document.createElement("a");
                    a.href = canvas.current!.toDataURL();
                    a.download = "coastseg-mask.png";
                    a.click();
                  }}
                >
                  <Download size={15} />
                  {t.mask}
                </button>
                <button className="button secondary" onClick={saveJSON}>
                  <Download size={15} />
                  {t.report}
                </button>
              </div>
              <p className="fine-print">
                {(result.elapsed_ms / 1000).toFixed(1)} s ·{" "}
                {result.manifest.version}
              </p>
            </>
          ) : (
            <div className="model-empty">{t.empty}</div>
          )}
          <a
            href="https://zenodo.org/records/14036903"
            target="_blank"
            rel="noreferrer"
            className="model-source"
          >
            Daniel Buscombe · CC BY 4.0
            <ExternalLink size={13} />
          </a>
          {manifest && (
            <p className="fine-print">
              {manifest.version} · ONNX ·{" "}
              {(manifest.size_bytes / 1048576).toFixed(1)} MB
            </p>
          )}
        </aside>
      </div>
      {error && (
        <div className="notice" role="alert">
          {error}
        </div>
      )}
      <div className="notice success">
        <ShieldCheck size={18} />
        {t.notice}
      </div>
    </div>
  );
}
