import mapboxgl from "mapbox-gl";
import { trackToLine } from "./track";

async function esriStyle() {
  // Adapted from https://gist.github.com/jgravois/51e2b30e3d6cf6c00f06b263a29108a2

  // https://esri.com/arcgis-blog/products/arcgis-living-atlas/mapping/new-osm-vector-basemap
  const styleUrl =
    "https://www.arcgis.com/sharing/rest/content/items/3e1a00aeae81496587988075fe529f71/resources/styles/root.json";

  // first fetch the esri style file
  // https://www.mapbox.com/mapbox-gl-js/style-spec
  const response = await fetch(styleUrl);
  const style = await response.json();
  // next fetch metadata for the raw tiles
  const metadataUrl = style.sources.esri.url;
  const metadataResponse = await fetch(metadataUrl);
  const metadata = await metadataResponse.json();

  function format(style, metadata, styleUrl) {
    // ArcGIS Pro published vector services dont prepend tile or tileMap urls with a /
    style.sources.esri = {
      type: "vector",
      scheme: "xyz",
      tilejson: metadata.tilejson || "2.0.0",
      format: (metadata.tileInfo && metadata.tileInfo.format) || "pbf",
      /* mapbox-gl-js does not respect the indexing of esri tiles
      because we cache to different zoom levels depending on feature density, in rural areas 404s will still be encountered.
      more info: https://github.com/mapbox/mapbox-gl-js/pull/1377
      */
      // index: metadata.tileMap ? style.sources.esri.url + '/' + metadata.tileMap : null,
      maxzoom: 15,
      tiles: [style.sources.esri.url + "/" + metadata.tiles[0]],
      description: metadata.description,
      name: metadata.name,
    };
    return style;
  }

  return format(style, metadata, styleUrl);
}

export async function makeMap(
  container,
  center = [-74.006, 40.7128],
  zoom = 11
) {
  const map = new mapboxgl.Map({
    container,
    style: await esriStyle(),
    center,
    customAttribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, map layer by Esri',
    zoom,
  });
  return map;
}

export function getCenter(coords) {
  let lngTotal = 0;
  let latTotal = 0;

  for (let i = 0; i < coords.length; i++) {
    lngTotal += coords[i][0];
    latTotal += coords[i][1];
  }

  return [lngTotal / coords.length, latTotal / coords.length];
}

function getBounds(coords) {
  let minLng = null;
  let maxLng = null;
  let minLat = null;
  let maxLat = null;

  for (let i = 0; i < coords.length; i++) {
    const lng = coords[i][0];
    const lat = coords[i][1];

    if (minLng == null || lng < minLng) {
      minLng = lng;
    }

    if (maxLng == null || lng > maxLng) {
      maxLng = lng;
    }

    if (minLat == null || lat < minLat) {
      minLat = lat;
    }

    if (maxLat == null || lat > maxLat) {
      maxLat = lat;
    }
  }

  return [
    [minLng, minLat],
    [maxLng, maxLat],
  ];
}

export function addCoords(map, coords) {
  map.on("load", () => {
    map.fitBounds(getBounds(coords), {
      padding: 20,
      duration: 0,
    });
    map.addSource("route", {
      type: "geojson",
      data: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: coords,
        },
      },
    });
    map.addLayer({
      id: "route",
      type: "line",
      source: "route",
      layout: {
        "line-join": "round",
        "line-cap": "round",
      },
      paint: {
        "line-color": "#ec466e",
        "line-width": 3,
      },
    });
  });
}

export function addTrack(map, track) {
  const trackLine = trackToLine(track);
  if (trackLine == null) return;

  map.on("load", () => {
    map.addSource("track", {
      type: "geojson",
      data: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: trackLine,
        },
      },
    });
    map.addLayer({
      id: "track",
      type: "line",
      source: "track",
      layout: {
        "line-join": "round",
        "line-cap": "round",
      },
      paint: {
        "line-color": "rgba(255, 165, 0, 0.7)",
        "line-width": 15,
      },
    });
  });
}
