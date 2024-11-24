var roi = ee.FeatureCollection('projects/mtb2023-399203/assets/Palo_verde');
// Configuración inicial para áreas quemadas

Map.setOptions('satellite');
Map.centerObject(roi, 14);

// Colección de Sentinel-2 para imágenes ópticas
function cloudMask(image) {
  var scl = image.select('SCL');
  var mask = scl.eq(3).or(scl.gte(7).and(scl.lte(10)));
  return image.updateMask(mask.eq(0));
}

var sentinel2 = ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
  .filterBounds(roi)
  .filterDate('2023-01-01', '2023-12-31')
  .map(cloudMask);

var antesIncendioS2 = sentinel2.filterDate('2023-01-01', '2023-04-15').mosaic().clip(roi);
var despuesIncendioS2 = sentinel2.filterDate('2023-04-16', '2023-06-01').mosaic().clip(roi);

Map.addLayer(antesIncendioS2, {bands: ['B4', 'B3', 'B2'], min: 0, max: 3000}, 'Antes del Incendio (S2)');
Map.addLayer(despuesIncendioS2, {bands: ['B4', 'B3', 'B2'], min: 0, max: 3000}, 'Después del Incendio (S2)');

// Colección de Sentinel-1 para imágenes SAR
var sentinel1 = ee.ImageCollection('COPERNICUS/S1_GRD')
  .filter(ee.Filter.eq('instrumentMode', 'IW'))
  .filter(ee.Filter.eq('orbitProperties_pass', 'DESCENDING'))
  .filterBounds(roi);

var antesIncendioS1 = sentinel1.filterDate('2023-01-01', '2023-04-15').mosaic().clip(roi);
var despuesIncendioS1 = sentinel1.filterDate('2023-04-16', '2023-06-01').mosaic().clip(roi);

// Aplicar filtro para reducir el speckle en imágenes SAR
var smoothingRadius = 10;
antesIncendioS1 = antesIncendioS1.focal_mean(smoothingRadius, 'circle', 'meters');
despuesIncendioS1 = despuesIncendioS1.focal_mean(smoothingRadius, 'circle', 'meters');

// Combinación de bandas antes y después
var combinacionSAR = antesIncendioS1.addBands(despuesIncendioS1);
var cambioSAR = combinacionSAR.expression('VH / VH_1', {
  'VH': combinacionSAR.select('VH'),
  'VH_1': combinacionSAR.select('VH_1')
}).rename('cambio');

// Detectar áreas quemadas aplicando un umbral
var umbralQuemadas = 0.75;
var zonasQuemadas = cambioSAR.lt(umbralQuemadas);
Map.addLayer(zonasQuemadas.updateMask(zonasQuemadas), {palette: ['red']}, 'Zonas Quemadas');

// Exportar las áreas quemadas
Export.image.toDrive({
  image: zonasQuemadas,
  description: 'Burned_Areas',
  scale: 10,
  region: roi,
  fileFormat: 'GeoTIFF'
});