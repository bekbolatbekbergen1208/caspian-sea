"""Real pretrained weights are used; assertions test plumbing, not coastline accuracy."""
from pathlib import Path
import hashlib,json
import numpy as np
import pytest
pytest.importorskip("onnxruntime")
Image=pytest.importorskip("PIL.Image")
import model_inference as inference
ROOT=Path(__file__).resolve().parents[2]

def test_actual_model_integrity_and_output_shape():
    meta=json.loads((ROOT/'public/models/coastseg-rgb.json').read_text())
    assert hashlib.sha256((ROOT/'public/models/coastseg-rgb.onnx').read_bytes()).hexdigest()==meta['onnx_sha256']
    rgb=np.asarray(Image.open(ROOT/'public/images/sentinel-2026.jpg').convert('RGB'))
    labels,loaded=inference.predict_rgb(rgb)
    assert labels.shape==rgb.shape[:2]
    assert set(np.unique(labels)).issubset({0,1,2,3})
    assert loaded['source_md5']=='d8fea34db908f9924a8dbaac7a479e3a'

def test_rgb_channel_validation():
    with pytest.raises(ValueError,match='RGB'):inference.predict_rgb(np.zeros((10,10),dtype=np.uint8))

def test_ndwi_comparison_uses_valid_mask_only():
    # Synthetic test only. Model predictions on constant RGB are not scientific observations.
    b=np.ones((7,8,8),dtype=np.float32);b[0]=.3;b[1]=.1;b[2]=.1;b[3]=6;b[5]=.2;b[6]=.1
    valid=np.zeros((8,8),bool);valid[:2]=True
    r=inference.compare_to_ndwi(b,b,valid,100,0)
    assert 0<=r['before']['agreement_fraction']<=1
    assert r['before']==r['after']
    assert r['before']['water_disagreement_km2']<=16*100/1e6
    assert r['meaning']=='agreement between classifiers, not measured accuracy'
