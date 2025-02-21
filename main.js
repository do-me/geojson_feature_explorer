const map = new maplibregl.Map({
    container: 'map',
    style: 'https://tiles.openfreemap.org/styles/liberty',
    center: [0, 0],
    zoom: 2
});

let geojsonSource = null; // Keep this, it's fine for the source.

// No need for global layer variables.  We'll manage layer existence directly on the map.

function updateFeatureDropdown(geojson) {
    // ... (Your existing code, this part is correct) ...
    const dropdown = document.getElementById('feature-select');
    dropdown.innerHTML = '';

    const zoomAllOption = document.createElement('option');
    zoomAllOption.value = 'all';
    zoomAllOption.text = 'Zoom to All';
    dropdown.appendChild(zoomAllOption);

    if (geojson && geojson.features && geojson.features.length > 0) {
        geojson.features.forEach((feature, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.text = feature.properties.name || `Feature ${index + 1}`;
            dropdown.appendChild(option);
        });
        document.getElementById('feature-dropdown').style.display = 'block';
    } else {
        document.getElementById('feature-dropdown').style.display = 'none';
    }
}

function zoomToFeature(featureIndex) {
    // ... (Your existing code, this part is correct) ...
    if (!geojsonSource || !geojsonSource.data || !geojsonSource.data.features) {
        console.warn("GeoJSON data not loaded or invalid.");
        return;
    }

    const flyDuration = parseInt(document.getElementById('fly-duration').value, 10);

    if (featureIndex === "all") {
        const bounds =  new maplibregl.LngLatBounds();
        geojsonSource.data.features.forEach(feature => {
          const processCoordinates = (coords) => {
                if (Array.isArray(coords) && coords.length > 0) {
                  if (Array.isArray(coords[0])) {
                    coords.forEach(processCoordinates);
                  } else {
                    bounds.extend(coords);
                  }
                }
          };
          processCoordinates(feature.geometry.coordinates);

        });

        if (!bounds.isEmpty()) {
             map.fitBounds(bounds, { padding: 20, duration: flyDuration });
        }
    } else {
        const feature = geojsonSource.data.features[parseInt(featureIndex, 10)];
        if (!feature) {
            console.warn("Feature not found at index:", featureIndex);
            return;
        }

        const bounds = new maplibregl.LngLatBounds();
       const processCoordinates = (coords) => {
            if (Array.isArray(coords) && coords.length > 0) {
                if (Array.isArray(coords[0])) {
                   coords.forEach(processCoordinates);
                }
                else {
                    bounds.extend(coords);
                }
            }
        };
        processCoordinates(feature.geometry.coordinates);



        if (!bounds.isEmpty()) {
             map.fitBounds(bounds, { padding: 20, duration: flyDuration });
        }
    }
}

function handleFile(file) {
    const reader = new FileReader();

    reader.onload = function(e) {
        try {
            const geojson = JSON.parse(e.target.result);

            // Check if the source exists *before* removing layers and source.
            if (map.getSource('geojson-data')) {
                // Check if the layers exist *before* removing them.
                if (map.getLayer('geojson-layer-fill')) {
                    map.removeLayer('geojson-layer-fill');
                }
                if (map.getLayer('geojson-layer-line')) {
                    map.removeLayer('geojson-layer-line');
                }
                map.removeSource('geojson-data');
            }

            geojsonSource = {
                type: 'geojson',
                data: geojson
            };

            map.addSource('geojson-data', geojsonSource);
            addLayers();  // addLayers() is now safe.
            zoomToFeature("all");
            updateFeatureDropdown(geojson);

        } catch (error) {
            console.error("Error parsing GeoJSON:", error);
            alert("Invalid GeoJSON file.");
        }
        document.getElementById('drop-area').style.display = 'none';
    };
    reader.readAsText(file);
}


function addLayers() {
    // No need to remove layers here. We handle removal in handleFile.

    const geojsonLayerFill = {
        'id': 'geojson-layer-fill',
        'type': 'fill',
        'source': 'geojson-data',
        'paint': {
            'fill-color': document.getElementById('fill-color').value,
            'fill-opacity': 0.5
        },
        'filter': ['==', '$type', 'Polygon']
    };
    map.addLayer(geojsonLayerFill);

    const geojsonLayerLine = {
        'id': 'geojson-layer-line',
        'type': 'line',
        'source': 'geojson-data',
        'paint': {
            'line-color': document.getElementById('stroke-color').value,
            'line-width': parseInt(document.getElementById('stroke-width').value, 10),
            'line-opacity': 0.5
        }
    };
    map.addLayer(geojsonLayerLine);
}

function updateStyle() {
    if (!map.getSource('geojson-data')) {
        return;
    }
    map.setPaintProperty('geojson-layer-line', 'line-color', document.getElementById('stroke-color').value);
    map.setPaintProperty('geojson-layer-line', 'line-width', parseInt(document.getElementById('stroke-width').value, 10));

    if (map.getLayer('geojson-layer-fill')) {
        map.setPaintProperty('geojson-layer-fill', 'fill-color', document.getElementById('fill-color').value);
    }
}


const dropArea = document.getElementById('drop-area');
const fileInput = document.getElementById('file-input');

['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, preventDefaults, false);
    document.body.addEventListener(eventName, preventDefaults, false);
});

['dragenter', 'dragover'].forEach(eventName => {
    dropArea.addEventListener(eventName, highlight, false);
});

['dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, unhighlight, false);
});

dropArea.addEventListener('drop', handleDrop, false);
// dropArea.addEventListener('click', () => fileInput.click()); // Trigger file input on click.  This line is fine.


function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

function highlight(e) {
    dropArea.classList.add('active');
}

function unhighlight(e) {
    dropArea.classList.remove('active');
}

function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;

    if (files.length > 0) {
        handleFile(files[0]);
    }
}

function handleFileInput(files) {
    if (files.length > 0) {
        handleFile(files[0]);
    }
}

// Initial load:  Don't add the layers until a file is loaded.
// This prevents trying to remove them before they exist.
map.on('load', () => {
    // Initialize an empty source, but *don't* add the layers yet.
    geojsonSource = { type: 'geojson', data: { type: "FeatureCollection", features: [] } };
    map.addSource('geojson-data', geojsonSource);
    // addLayers(); // REMOVE THIS LINE
    updateFeatureDropdown(null); // This is correct, show no features initially.
    if (!map.getStyle()) { // wait for map loading
      return;
    }
});