"""Synthetic fixtures are tests only, never exposed as scientific observations."""
import numpy as np
import pytest
from rasterio.transform import from_origin
from rasterio.crs import CRS
from processing import classify, summarize

def bands(mask):
    b=np.zeros((5,*mask.shape),dtype=np.float32)
    b[0]=np.where(mask,.3,.1);b[1]=np.where(mask,.1,.3)
    b[2]=.1;b[3]=6;b[4]=1
    return b

def test_ndwi_and_cloud_screening():
    b=bands(np.ones((3,3),bool));b[3,0,0]=9;b[0,1,1]=0;b[1,1,1]=0
    ndwi,_,valid,water=classify(b)
    assert ndwi[2,2]==pytest.approx(.5)
    assert not valid[0,0] and not valid[1,1]
    assert water.sum()==7

def test_exact_change_and_joint_mask():
    before=np.zeros((10,10),bool);before[:,:5]=True
    after=np.zeros((10,10),bool);after[:,:3]=True;after[0,9]=True
    b,a=bands(before),bands(after);a[3,0,3]=9
    r=summarize(b,a,from_origin(500000,4840000,10,10),CRS.from_epsg(32639))
    assert r['exposed_km2']==pytest.approx(19*100/1e6)
    assert r['flooded_km2']==pytest.approx(100/1e6)
    assert r['valid_fraction']==pytest.approx(.99)
    assert r['displacement_m'] is not None
    assert r['shoreline']['features']

def test_no_joint_coverage_raises():
    b=bands(np.ones((4,4),bool));b[4]=0
    with pytest.raises(ValueError,match='jointly valid'):summarize(b,b,from_origin(0,0,10,10),CRS.from_epsg(32639))

def test_uniform_water_has_no_fake_aoi_shoreline():
    b=bands(np.ones((4,4),bool))
    r=summarize(b,b,from_origin(500000,4840000,10,10),CRS.from_epsg(32639))
    assert r['shoreline']['features']==[]
    assert r['displacement_m'] is None

def test_reject_geographic_area():
    b=bands(np.ones((4,4),bool))
    with pytest.raises(ValueError,match='projected'):summarize(b,b,from_origin(51,44,.0001,.0001),CRS.from_epsg(4326))

def test_polygon_masks_changes():
    from shapely.geometry import box,mapping
    b=bands(np.ones((10,10),bool));a=bands(np.zeros((10,10),bool))
    r=summarize(b,a,from_origin(0,100,10,10),CRS.from_epsg(32639),mapping(box(0,0,50,100)))
    assert r['exposed_km2']==pytest.approx(50*100/1e6)
    assert r['valid_fraction']==1
