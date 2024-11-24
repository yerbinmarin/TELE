// Configuración inicial para inundaciones
Map.setOptions('satellite');
Map.centerObject(roi, 14);

// Colección de Sentinel-1 para imágenes SAR
var sentinel1 = ee.ImageCollection('COPERNICUS/S1_GRD')
  .filter(ee.Filter.eq('instrumentMode', 'IW')) // Modo Interferometric Wide
  .filter(ee.Filter.eq('orbitProperties_pass', 'ASCENDING')) // Órbita ascendente
  .filterBounds(roi);

// Filtrar las imágenes antes y después del evento
var sarInundacionAntes = sentinel1.filterDate('2023-04-01', '2023-04-15')
  .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VH'))
  .select('VH')
  .mosaic()
  .clip(roi);

var sarInundacionDespues = sentinel1.filterDate('2023-04-16', '2023-04-30')
  .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VH'))
  .select('VH')
  .mosaic()
  .clip(roi);

// Parámetros de visualización para imágenes SAR
var visParamsSAR = {
  min: -25,
  max: 0,
  palette: ['black', 'gray', 'white']
};

// Mostrar imágenes SAR antes y después en el mapa
Map.addLayer(sarInundacionAntes, visParamsSAR, 'SAR Antes Inundación');
Map.addLayer(sarInundacionDespues, visParamsSAR, 'SAR Después Inundación');

// Aplicar filtro para reducir el speckle en imágenes SAR
var SmoothSAR = 50;
var sarInundacionAntesFiltered = sarInundacionAntes.focal_mean(SmoothSAR, 'circle', 'meters');
var sarInundacionDespuesFiltered = sarInundacionDespues.focal_mean(SmoothSAR, 'circle', 'meters');

// Calcular diferencia entre imágenes SAR (inundación)
var diferenciaInundacion = sarInundacionDespuesFiltered.subtract(sarInundacionAntesFiltered);
Map.addLayer(diferenciaInundacion, {min: -5, max: 5, palette: ['red', 'yellow', 'green']}, 'Diferencia SAR Inundación');

// Detectar áreas inundadas aplicando un umbral
var umbralInundacion = 1; // Ajustar este valor según el análisis
var zonasInundadas = diferenciaInundacion.gt(umbralInundacion);
Map.addLayer(zonasInundadas.updateMask(zonasInundadas), {palette: ['blue']}, 'Áreas Inundadas');

// Exportar las áreas inundadas
Export.image.toDrive({
  image: zonasInundadas,
  description: 'Flooding_Areas',
  scale: 10,
  region: roi,
  fileFormat: 'GeoTIFF'
});
