"""NDWI baseline. All outputs use a shared metric grid and joint valid footprint."""
import numpy as np
from scipy.ndimage import binary_erosion, binary_dilation
from rasterio.features import shapes, geometry_mask
from rasterio.transform import Affine
from shapely.geometry import shape, mapping, LineString
from shapely.ops import unary_union, transform as transform_geometry
from pyproj import Transformer
ALGORITHM = 'ndwi-scl-v1.0.0'
VALID_SCL = [4, 5, 6]  # vegetation, bare soil, water; exclude all shadows

def classify(bands, threshold=0.0):
    green, nir, swir, scl, data_mask = bands
    den = green + nir
    valid = (data_mask > 0) & np.isin(scl, VALID_SCL) & np.isfinite(green) & np.isfinite(nir) & (den > 1e-8)
    ndwi = np.divide(green-nir, den, out=np.zeros_like(green, dtype=np.float32), where=den>1e-8)
    swir_den = green+swir
    mndwi = np.divide(green-swir, swir_den, out=np.zeros_like(green, dtype=np.float32), where=swir_den>1e-8)
    return ndwi, mndwi, valid, valid & (ndwi > threshold)

def shoreline_lines(water, valid, transform):
    """Only shared water/land cell edges, excluding AOI and no-data edges."""
    segments = []
    horizontal = valid[:, :-1] & valid[:, 1:] & (water[:, :-1] != water[:, 1:])
    vertical = valid[:-1, :] & valid[1:, :] & (water[:-1, :] != water[1:, :])
    for row, col in np.argwhere(horizontal):
        segments.append(LineString([transform*(int(col)+1,int(row)),transform*(int(col)+1,int(row)+1)]))
    for row, col in np.argwhere(vertical):
        segments.append(LineString([transform*(int(col),int(row)+1),transform*(int(col)+1,int(row)+1)]))
    if not segments:
        return None
    return unary_union(segments)

def summarize(before_bands, after_bands, transform:Affine, crs, aoi=None, threshold=0):
    if before_bands.shape != after_bands.shape or before_bands.shape[0] != 5:
        raise ValueError('Both dates require the same grid and five bands')
    if not crs.is_projected:
        raise ValueError('Area measurements require a projected metric CRS')
    _, mb, vb, wb = classify(before_bands, threshold)
    _, ma, va, wa = classify(after_bands, threshold)
    inside = np.ones(vb.shape, dtype=bool)
    if aoi:
        inside = geometry_mask([aoi], out_shape=vb.shape, transform=transform, invert=True)
    if not inside.any():
        raise ValueError('Study area contains no pixel centers')
    valid = vb & va & inside
    if not valid.any():
        raise ValueError('No jointly valid pixels. Choose clearer scenes.')
    pixel_area = abs(transform.a*transform.e-transform.b*transform.d)
    exposed = valid & wb & ~wa
    flooded = valid & ~wb & wa
    old_line, new_line = shoreline_lines(wb,valid,transform), shoreline_lines(wa,valid,transform)
    transformer = Transformer.from_crs(crs, 'EPSG:4326', always_xy=True)
    features=[]
    for period,line in [('before',old_line),('after',new_line)]:
        if line is not None:
            geo = transform_geometry(transformer.transform, line.simplify(5, preserve_topology=True))
            features.append({'type':'Feature','properties':{'period':period,'algorithm':ALGORITHM},'geometry':mapping(geo)})
    displacement=None
    if old_line is not None and new_line is not None:
        distances=[]
        for one,other in [(old_line,new_line),(new_line,old_line)]:
            pieces=list(one.geoms) if hasattr(one,'geoms') else [one]
            for piece in pieces[::max(1,len(pieces)//2000)]:
                distances.append(piece.interpolate(0.5,normalized=True).distance(other))
        displacement=float(np.median(distances)) if distances else None
    # One 10 m neighborhood on both dates, constrained to the joint valid mask.
    def edge_band(water):
        edge = np.zeros_like(valid)
        h = valid[:, :-1] & valid[:, 1:] & (water[:, :-1] != water[:, 1:])
        v = valid[:-1, :] & valid[1:, :] & (water[:-1, :] != water[1:, :])
        edge[:, :-1] |= h; edge[:, 1:] |= h
        edge[:-1, :] |= v; edge[1:, :] |= v
        return edge & valid
    edge_b = edge_band(wb)
    edge_a = edge_band(wa)
    diagnostic = valid & ((mb > threshold) != (ma > threshold))
    limitations=['Shoreline change is not a direct sea-level measurement.',
        'Boundary sensitivity is a one-pixel estimate, not a calibrated confidence interval.',
        'SCL is 20 m resampled to 10 m; turbidity, waves, wind and threshold bias remain.',
        'Displacement is symmetric median nearest-boundary distance, not signed transect retreat.']
    fraction=float(valid.sum()/inside.sum())
    if fraction<0.8: limitations.append('LOW_VALID_COVERAGE: less than 80% jointly valid area.')
    return {'algorithm':ALGORITHM,'exposed_km2':float(exposed.sum()*pixel_area/1e6),
        'flooded_km2':float(flooded.sum()*pixel_area/1e6),
        'water_before_km2':float((wb&valid).sum()*pixel_area/1e6),
        'water_after_km2':float((wa&valid).sum()*pixel_area/1e6),
        'valid_fraction':fraction,'resolution_m':float(abs(transform.a)),
        'uncertainty_km2':float((edge_b|edge_a).sum()*pixel_area/1e6),
        'displacement_m':displacement,'shoreline':{'type':'FeatureCollection','features':features},
        'threshold':threshold,'projection':str(crs),'limitations':limitations,
        'mndwi_changed_km2':float(diagnostic.sum()*pixel_area/1e6)}
