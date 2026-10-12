"""Create reproducible runtime parity fixtures from the real Sentinel quicklook."""
from pathlib import Path
import json
import numpy as np
import onnxruntime as ort
from PIL import Image
root=Path(__file__).resolve().parents[1]
qa=root/'.model-qa';qa.mkdir(exist_ok=True)
image=Image.open(root/'public/images/sentinel-2026.jpg').convert('RGB').resize((512,512),Image.Resampling.BILINEAR)
rgb=np.asarray(image,dtype=np.float32)
tensor=((rgb-rgb.mean())/max(float(rgb.std()),1/512)).transpose(2,0,1)[None]
tensor.tofile(qa/'model-input.f32')
np.asarray(image.convert('RGBA')).tofile(qa/'model-rgba.bin')
manifest=json.loads((root/'public/models/coastseg-rgb.json').read_text())
session=ort.InferenceSession(str(root/'public/models/coastseg-rgb.onnx'),providers=['CPUExecutionProvider'])
session.run(None,{manifest['input_name']:tensor})[0].tofile(qa/'model-logits.f32')
