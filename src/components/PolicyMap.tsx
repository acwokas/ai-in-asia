import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { supabase } from "@/integrations/supabase/client";

interface PolicyMapProps {
  regions: Array<{
    id: string;
    name: string;
    slug: string;
    description: string;
  }>;
  recentlyUpdatedRegions: string[];
}

const PolicyMap = ({ regions, recentlyUpdatedRegions }: PolicyMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const navigate = useNavigate();
  const [mapToken, setMapToken] = useState<string>('');
  const [mapError, setMapError] = useState<string>('');

  useEffect(() => {
    let cancelled = false;
    let tokenFetched = false;
    const timeoutId = setTimeout(() => {
      if (!cancelled && !tokenFetched) {
        setMapError('Map took too long to load. Region cards are available below.');
      }
    }, 10000);

    const fetchToken = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-mapbox-token');

        if (cancelled) return;

        if (error) {
          setMapError('Unable to load map. Browse regions using the cards below.');
          return;
        }

        const token = (data as { token?: string } | null)?.token;
        if (token) {
          tokenFetched = true;
          clearTimeout(timeoutId);
          setMapToken(token);
        } else {
          setMapError('Map configuration unavailable. Browse regions using the cards below.');
        }
      } catch {
        if (!cancelled) {
          setMapError('Unable to load map. Browse regions using the cards below.');
        }
      }
    };

    fetchToken();

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    if (!mapContainer.current || !mapToken) return;

    // Clean up existing map if any
    if (map.current) {
      map.current.remove();
      map.current = null;
    }

    try {
      mapboxgl.accessToken = mapToken;
      
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/dark-v11',
        center: [100, 20],
        zoom: 2,
        projection: 'mercator' as any
      });

      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

      const regionCoordinates: Record<string, [number, number]> = {
        'north-asia': [135, 37],
        'asean': [105, 10],
        'oceania': [145, -25],
        'greater-china': [110, 35],
        'anglosphere': [-95, 40],
        'europe': [10, 50],
        'mena': [45, 25],
        'africa': [20, 0],
        'latin-america': [-60, -10],
        'south-asia': [78, 20],
        'pan-pacific': [180, 0],
        'pan-asia': [100, 30],
        'global-comparison': [0, 20]
      };

      map.current.on('load', () => {
        if (!map.current) return;
        
        regions.forEach((region) => {
          const coords = regionCoordinates[region.slug];
          if (!coords || !map.current) return;

          const isRecent = recentlyUpdatedRegions.includes(region.slug);

          // Create marker container with pulse effect
          const markerContainer = document.createElement('div');
          markerContainer.style.cssText = `
            width: 30px;
            height: 30px;
          `;
          
          // Add pulse ring if recently updated
          if (isRecent) {
            const pulseRing = document.createElement('div');
            pulseRing.className = 'pulse-ring';
            pulseRing.style.cssText = `
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              width: 30px;
              height: 30px;
              border-radius: 50%;
              border: 2px solid hsl(var(--primary));
              animation: pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
              pointer-events: none;
            `;
            markerContainer.appendChild(pulseRing);
          }

          const el = document.createElement('div');
          el.className = 'policy-map-marker';
          el.style.cssText = `
            width: 30px;
            height: 30px;
            border-radius: 50%;
            background-color: hsl(var(--primary));
            border: 3px solid rgba(255,255,255,0.3);
            cursor: pointer;
            box-shadow: 0 2px 8px rgba(0,0,0,0.5);
            transition: all 0.2s;
          `;
          
          el.addEventListener('mouseenter', () => {
            el.style.boxShadow = '0 4px 16px rgba(0,0,0,0.6)';
            el.style.borderColor = 'rgba(255,255,255,0.6)';
          });
          
          el.addEventListener('mouseleave', () => {
            el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.5)';
            el.style.borderColor = 'rgba(255,255,255,0.3)';
          });

          markerContainer.appendChild(el);

          const popup = new mapboxgl.Popup({ 
            offset: 25,
            closeButton: false,
            closeOnClick: false,
            className: 'policy-map-popup'
          }).setHTML(`
            <div style="padding: 8px; background: #1a1b23; border-radius: 8px; border: 1px solid #2a2d42;">
              <h3 style="margin: 0 0 4px 0; font-weight: 600; color: #fff; font-size: 14px;">${region.name}</h3>
              <p style="margin: 0; font-size: 12px; color: #b0b4c8;">${region.description}</p>
              ${isRecent ? '<span style="display: inline-block; margin-top: 6px; padding: 2px 8px; background: hsl(var(--primary)); color: white; font-size: 10px; border-radius: 4px; font-weight: 500;">Recently Updated</span>' : ''}
            </div>
          `);

          const marker = new mapboxgl.Marker(markerContainer)
            .setLngLat(coords)
            .setPopup(popup)
            .addTo(map.current!);

          // Show popup on hover
          el.addEventListener('mouseenter', () => {
            popup.addTo(map.current!);
          });
          
          el.addEventListener('mouseleave', () => {
            popup.remove();
          });

          el.addEventListener('click', () => {
            navigate(`/ai-policy-atlas/${region.slug}`);
          });
        });
      });

      map.current.on('error', () => {
        setMapError('Map failed to load. Browse regions using the cards below.');
      });
    } catch {
      setMapError('Map failed to initialise. Browse regions using the cards below.');
    }

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [mapToken, regions, navigate, recentlyUpdatedRegions]);

  if (mapError) {
    return (
      <div className="w-full h-[200px] bg-muted/30 border border-border rounded-lg flex items-center justify-center">
        <p className="text-sm text-muted-foreground">{mapError}</p>
      </div>
    );
  }

  if (!mapToken) {
    return (
      <div className="w-full h-[300px] md:h-[500px] bg-muted rounded-lg flex items-center justify-center">
        <p className="text-muted-foreground">Loading map...</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-[300px] md:h-[500px] rounded-lg overflow-hidden shadow-lg border border-border">
      <style>{`
        @keyframes pulse-ring {
          0% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 1;
          }
          50% {
            transform: translate(-50%, -50%) scale(1.5);
            opacity: 0.5;
          }
          100% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 1;
          }
        }
        .policy-map-popup .mapboxgl-popup-content {
          background: transparent !important;
          box-shadow: none !important;
          padding: 0 !important;
        }
        .policy-map-popup .mapboxgl-popup-tip {
          border-top-color: #1a1b23 !important;
        }
      `}</style>
      <div ref={mapContainer} className="absolute inset-0 w-full h-full" />
      <div className="absolute bottom-2 left-2 md:bottom-4 md:left-4 bg-background/95 backdrop-blur px-2 py-1 md:px-4 md:py-2 rounded-md shadow-md max-w-[90%]">
        <p className="text-xs md:text-sm text-muted-foreground">
          <span className="hidden md:inline">Hover over markers to view details · Pulsing markers indicate recent updates</span>
          <span className="md:hidden">Tap markers for details</span>
        </p>
      </div>
    </div>
  );
};

export default PolicyMap;
