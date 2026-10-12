"""Export verified CoastSeg release v4 weights to ONNX and compare logits.
Run in the optional ML conversion environment, not in the geospatial service.
"""
from pathlib import Path
import hashlib,json,os
os.environ['TF_CPP_MIN_LOG_LEVEL']='2'
os.environ['CUDA_VISIBLE_DEVICES']='-1'
os.environ['HF_HOME']=str(Path(__file__).resolve().parents[1]/'.cache/huggingface')
import numpy as np
import tensorflow as tf
# Keras groups>1 convolutions use a nested XLA function that tf2onnx cannot inline.
# The direct convolution path has identical mathematical semantics.
tf.keras.layers.Conv2D._jit_compiled_convolution_op=tf.keras.layers.Conv2D.convolution_op
tf.config.optimizer.set_experimental_options({"remapping":False})
from transformers import SegformerConfig,TFSegformerForSemanticSegmentation
import tf2onnx
import onnxruntime as ort
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
RAW=ROOT/'models/coastseg/Global_4class_rgb_512_v4_segformer.h5'
EXPECTED_MD5='d8fea34db908f9924a8dbaac7a479e3a'
assert hashlib.md5(RAW.read_bytes()).hexdigest()==EXPECTED_MD5,'Unexpected source model checksum'
config=SegformerConfig(num_labels=4,id2label={0:'water',1:'whitewater',2:'sediment',3:'other'},label2id={'water':0,'whitewater':1,'sediment':2,'other':3})
model=TFSegformerForSemanticSegmentation(config)
model(tf.zeros((1,3,512,512),dtype=tf.float32),training=False)
model.load_weights(str(RAW))  # Strict loading: do not ignore missing/mismatched weights.

@tf.function(input_signature=[tf.TensorSpec([1,3,512,512],tf.float32,name='pixel_values')])
def forward(pixel_values):
    return tf.identity(model(pixel_values,training=False).logits,name='logits')

out=ROOT/'public/models/coastseg-rgb.onnx';out.parent.mkdir(parents=True,exist_ok=True)
proto,_=tf2onnx.convert.from_function(forward,input_signature=forward.input_signature,opset=17,output_path=str(out))
image=np.asarray(Image.open(ROOT/'public/images/sentinel-2026.jpg').convert('RGB').resize((512,512),Image.Resampling.BILINEAR),dtype=np.float32)
mean=float(image.mean());std=max(float(image.std()),1/np.sqrt(512*512));inp=((image-mean)/std).transpose(2,0,1)[None]
tf_logits=forward(tf.constant(inp)).numpy()
session=ort.InferenceSession(str(out),providers=['CPUExecutionProvider'])
ort_logits=session.run(None,{session.get_inputs()[0].name:inp})[0]
max_diff=float(np.max(np.abs(tf_logits-ort_logits)))
agreement=float(np.mean(tf_logits.argmax(1)==ort_logits.argmax(1)))
assert np.allclose(tf_logits,ort_logits,rtol=1e-3,atol=1e-3),f'ONNX logits differ: {max_diff}'
assert agreement>.999,'ONNX label agreement failed'
manifest={'name':'CoastSeg SegFormer RGB','version':'global_rgb_512_v4','record':'https://zenodo.org/records/14036903','doi':'10.5281/zenodo.14036903','license':'CC-BY-4.0','source_file':RAW.name,'source_md5':EXPECTED_MD5,'onnx_sha256':hashlib.sha256(out.read_bytes()).hexdigest(),'input_shape':[1,3,512,512],'output_shape':list(ort_logits.shape),'input_name':session.get_inputs()[0].name,'output_name':session.get_outputs()[0].name,'classes':['water','whitewater','sediment','other'],'preprocessing':'bilinear resize to 512 square; global RGB mean and adjusted population std; CHW float32','opset':17,'size_bytes':out.stat().st_size,'verification':{'image':'Sentinel-2B 39TWJ 2026-10-11 official quicklook','max_logit_error':max_diff,'label_agreement':agreement},'limitations':['Not validated for Caspian shoreline accuracy.','Preview segmentation is qualitative; no area or sea-level measurement.','Softmax scores are not calibrated confidence.','No cloud/SCL mask is available for JPEG previews.']}
(ROOT/'public/models/coastseg-rgb.json').write_text(json.dumps(manifest,indent=2)+'\n')
# Save the real prediction for inspection; not a fabricated demonstration.
labels=ort_logits.argmax(1)[0].astype(np.uint8)
palette=np.array([[22,200,232],[245,249,255],[230,165,103],[104,128,147]],dtype=np.uint8)
Image.fromarray(palette[labels]).resize((343,343),Image.Resampling.NEAREST).save(ROOT/'models/coastseg/verified-preview-mask.png')
print(json.dumps({'onnx':str(out),'bytes':out.stat().st_size,'max_logit_error':max_diff,'label_agreement':agreement,'output_shape':list(ort_logits.shape)}))
