"""Optional ONNX classifier for georeferenced Sentinel RGB arrays.
The browser uses the same exported weights; SCL/area logic stays in processing.py.
"""
from pathlib import Path
import hashlib,json,os,threading
import numpy as np
from PIL import Image
from scipy.ndimage import zoom
_lock=threading.Lock()
_session=None
_manifest=None

def load_model():
    global _session,_manifest
    if _session is not None:return _session,_manifest
    with _lock:
        if _session is not None:return _session,_manifest
        import onnxruntime as ort
        path=Path(os.environ.get('ML_MODEL_PATH',str(Path(__file__).resolve().parents[1]/'public/models/coastseg-rgb.onnx')))
        meta_path=path.with_suffix('.json')
        if not path.is_file() or not meta_path.is_file():raise ValueError('CoastSeg ONNX model/manifest missing on processing server')
        meta=json.loads(meta_path.read_text())
        if hashlib.sha256(path.read_bytes()).hexdigest()!=meta['onnx_sha256']:raise ValueError('CoastSeg model checksum mismatch')
        options=ort.SessionOptions();options.intra_op_num_threads=2
        _session=ort.InferenceSession(str(path),sess_options=options,providers=['CPUExecutionProvider']);_manifest=meta
    return _session,_manifest

def predict_rgb(rgb):
    if rgb.ndim!=3 or rgb.shape[-1]!=3:raise ValueError('RGB HWC input required')
    original=rgb.shape[:2]
    resized=np.asarray(Image.fromarray(np.asarray(rgb,dtype=np.uint8)).resize((512,512),Image.Resampling.BILINEAR),dtype=np.float32)
    mean=float(resized.mean());std=max(float(resized.std()),1/np.sqrt(512*512))
    tensor=((resized-mean)/std).transpose(2,0,1)[None]
    session,meta=load_model()
    logits=session.run([meta['output_name']],{meta['input_name']:tensor})[0][0]
    # Bilinear logits sampling with half-pixel coordinates, matching TF resize.
    from scipy.ndimage import map_coordinates
    h,w=logits.shape[1:]
    yy=np.clip((np.arange(original[0])+.5)*h/original[0]-.5,0,h-1)
    xx=np.clip((np.arange(original[1])+.5)*w/original[1]-.5,0,w-1)
    grid=np.meshgrid(yy,xx,indexing='ij')
    full=np.stack([map_coordinates(channel,grid,order=1,mode='nearest') for channel in logits])
    return full.argmax(0).astype(np.uint8),meta

def compare_to_ndwi(before,after,valid,pixel_area,threshold):
    from processing import classify
    outputs=[];meta=None
    for bands in [before,after]:
        # Input bands: B03 B08 B11 SCL dataMask B04 B02.
        rgb=np.clip(np.stack([bands[5],bands[0],bands[6]],axis=-1)*2.5*255,0,255).astype(np.uint8)
        labels,meta=predict_rgb(rgb)
        _,_,_,water=classify(bands[:5],threshold)
        disagreement=valid&((labels==0)!=water)
        outputs.append({'agreement_fraction':float(1-disagreement.sum()/valid.sum()),'water_disagreement_km2':float(disagreement.sum()*pixel_area/1e6)})
    return {'model':meta['name'],'version':meta['version'],'sha256':meta['onnx_sha256'],'source':meta['record'],'before':outputs[0],'after':outputs[1],'meaning':'agreement between classifiers, not measured accuracy','rgb_rendering':'surface reflectance ×2.5, clipped to uint8 RGB','limitations':['Not validated against Caspian ground truth.','Global 512-square resampling changes effective feature scale.','Clouds excluded from metrics by joint SCL mask; image context can still affect predictions.']}
