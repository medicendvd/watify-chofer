import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { SimplirouteRoute } from '../../types';

// Fix Leaflet's default icon path issue with bundlers
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface Props {
  routes: SimplirouteRoute[];
}

function statusColor(status: string): string {
  if (status === 'completed') return '#10b981'; // verde
  if (status === 'failed')    return '#ef4444'; // rojo
  if (status === 'partial')   return '#f59e0b'; // amarillo
  return '#6b7280'; // gris (pending)
}

function makeCircleIcon(color: string, label: string | number) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="11" fill="${color}" stroke="white" stroke-width="2"/>
      <text x="12" y="16" text-anchor="middle" font-size="9" font-weight="bold" fill="white" font-family="sans-serif">${label}</text>
    </svg>`.trim();
  return L.divIcon({
    html: svg,
    className: '',
    iconSize:   [24, 24],
    iconAnchor: [12, 12],
    popupAnchor:[0, -14],
  });
}

function makeDriverIcon(color: string) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
      <circle cx="16" cy="16" r="14" fill="${color}" stroke="white" stroke-width="3"/>
      <text x="16" y="21" text-anchor="middle" font-size="14" fill="white" font-family="sans-serif">🚚</text>
    </svg>`.trim();
  return L.divIcon({
    html: svg,
    className: '',
    iconSize:   [32, 32],
    iconAnchor: [16, 16],
    popupAnchor:[0, -18],
  });
}

export default function SimplirouteMap({ routes }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Init map
    const map = L.map(containerRef.current, {
      zoomControl:       true,
      attributionControl: false,
    });
    mapRef.current = map;

    // Dark tile layer
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
    }).addTo(map);

    const allLatLngs: L.LatLng[] = [];

    routes.forEach(route => {
      const routeColor = route.color || '#1a2fa8';

      // Draw polyline through ordered visit coordinates
      const coords = route.visits.map(v => L.latLng(v.lat, v.lng));
      if (coords.length > 1) {
        L.polyline(coords, { color: routeColor, weight: 2, opacity: 0.4, dashArray: '4 6' }).addTo(map);
      }
      allLatLngs.push(...coords);

      // Visit markers
      route.visits.forEach(v => {
        const icon = makeCircleIcon(statusColor(v.status), v.order);
        L.marker([v.lat, v.lng], { icon })
          .bindPopup(`
            <div style="font-family:sans-serif;font-size:13px">
              <strong>#${v.order} ${v.title}</strong><br/>
              <span style="color:#6b7280;font-size:11px">${v.address}</span><br/>
              <span style="color:${statusColor(v.status)};font-weight:bold">${v.status}</span>
              ${v.checkout_time ? `<br/><span style="font-size:11px">✅ ${new Date(v.checkout_time).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</span>` : ''}
            </div>
          `)
          .addTo(map);
      });

      // Current driver position (last checkout)
      if (route.last_position) {
        const { lat, lng } = route.last_position;
        L.marker([lat, lng], { icon: makeDriverIcon(routeColor), zIndexOffset: 1000 })
          .bindPopup(`<strong>${route.driver_name}</strong><br/>Última posición conocida`)
          .addTo(map);
        allLatLngs.push(L.latLng(lat, lng));
      }
    });

    // Fit bounds
    if (allLatLngs.length > 0) {
      map.fitBounds(L.latLngBounds(allLatLngs), { padding: [40, 40] });
    } else {
      // Default: Guadalajara
      map.setView([20.6597, -103.3496], 12);
    }

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [routes]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      style={{ minHeight: '100%' }}
    />
  );
}
