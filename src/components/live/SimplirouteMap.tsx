import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { SimplirouteRoute } from '../../types';

function statusColor(status: string): string {
  if (status === 'completed') return '#10b981';
  if (status === 'failed')    return '#ef4444';
  if (status === 'partial')   return '#f59e0b';
  return '#6b7280';
}

function makeCircleIcon(color: string, label: string | number) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 22 22"><circle cx="11" cy="11" r="10" fill="${color}" stroke="white" stroke-width="2"/><text x="11" y="15" text-anchor="middle" font-size="8" font-weight="bold" fill="white" font-family="sans-serif">${label}</text></svg>`;
  return L.divIcon({ html: svg, className: '', iconSize: [22, 22], iconAnchor: [11, 11], popupAnchor: [0, -13] });
}

function makeDriverIcon(color: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36"><circle cx="18" cy="18" r="16" fill="${color}" stroke="white" stroke-width="3"/><text x="18" y="24" text-anchor="middle" font-size="16" fill="white" font-family="sans-serif">🚚</text></svg>`;
  return L.divIcon({ html: svg, className: '', iconSize: [36, 36], iconAnchor: [18, 18], popupAnchor: [0, -20] });
}

interface Props {
  routes: SimplirouteRoute[];
  height: number;
}

export default function SimplirouteMap({ routes, height }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const map = L.map(containerRef.current, {
      zoomControl: true,
      attributionControl: false,
      zoomSnap: 0.5,
    });
    mapRef.current = map;

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
    }).addTo(map);

    const allLatLngs: L.LatLng[] = [];

    routes.forEach(route => {
      const routeColor = route.color && route.color !== '#000000' ? route.color : '#1a7fd4';

      const coords = route.visits
        .filter(v => v.lat !== 0 && v.lng !== 0)
        .map(v => L.latLng(v.lat, v.lng));

      if (coords.length > 1) {
        L.polyline(coords, { color: routeColor, weight: 2.5, opacity: 0.5, dashArray: '5 7' }).addTo(map);
      }
      allLatLngs.push(...coords);

      route.visits.forEach(v => {
        if (v.lat === 0 && v.lng === 0) return;
        L.marker([v.lat, v.lng], { icon: makeCircleIcon(statusColor(v.status), v.order) })
          .bindPopup(`
            <div style="font:13px/1.4 sans-serif;min-width:160px">
              <strong>#${v.order} ${v.title}</strong><br/>
              <span style="color:#999;font-size:11px">${v.address}</span><br/>
              <span style="color:${statusColor(v.status)};font-weight:700">${v.status}</span>
              ${v.checkout_time ? `<br/><span style="font-size:11px">✅ ${new Date(v.checkout_time).toLocaleTimeString('es-MX',{hour:'2-digit',minute:'2-digit'})}</span>` : ''}
            </div>`)
          .addTo(map);
      });

      if (route.last_position) {
        const { lat, lng } = route.last_position;
        L.marker([lat, lng], { icon: makeDriverIcon(routeColor), zIndexOffset: 1000 })
          .bindPopup(`<strong>${route.driver_name}</strong><br/>Última posición`)
          .addTo(map);
        allLatLngs.push(L.latLng(lat, lng));
      }
    });

    if (allLatLngs.length > 0) {
      map.fitBounds(L.latLngBounds(allLatLngs), { padding: [50, 50] });
      map.setZoom(map.getZoom() + 0.5);
    } else {
      map.setView([20.6597, -103.3496], 12); // Guadalajara por defecto
    }

    return () => { map.remove(); mapRef.current = null; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);   // solo al montar, las rutas no cambian durante la vida del componente

  return <div ref={containerRef} style={{ width: '100%', height }} />;
}
