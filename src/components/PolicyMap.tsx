import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

interface PolicyMapProps {
  regions: Array<{
    id: string;
    name: string;
    slug: string;
    description: string;
  }>;
}

const PolicyMap = ({ regions }: PolicyMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const navigate = useNavigate();
  const [mapToken, setMapToken] = useState<string>('');

  useEffect(() => {
    // Fetch Mapbox token from edge function
    const fetchToken = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-mapbox-token`, {
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`
          }
        });
        
        if (!response.ok) {
          console.error('Failed to fetch Mapbox token');
          return;
        }
        
        const data = await response.json();
        if (data.token) {
          setMapToken(data.token);
        }
      } catch (error) {
        console.error('Error fetching Mapbox token:', error);
      }
    };
    
    fetchToken();
  }, []);

  useEffect(() => {
    if (!mapContainer.current || !mapToken) return;

    // Clean up existing map if any
    if (map.current) {
      map.current.remove();
      map.current = null;
    }

    mapboxgl.accessToken = mapToken;
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
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

        const el = document.createElement('div');
        el.className = 'policy-map-marker';
        el.style.width = '30px';
        el.style.height = '30px';
        el.style.borderRadius = '50%';
        el.style.backgroundColor = 'hsl(var(--primary))';
        el.style.border = '3px solid white';
        el.style.cursor = 'pointer';
        el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
        el.style.transition = 'all 0.2s';
        
        el.addEventListener('mouseenter', () => {
          el.style.transform = 'scale(1.2)';
          el.style.backgroundColor = 'hsl(var(--primary) / 0.8)';
        });
        
        el.addEventListener('mouseleave', () => {
          el.style.transform = 'scale(1)';
          el.style.backgroundColor = 'hsl(var(--primary))';
        });

        const marker = new mapboxgl.Marker(el)
          .setLngLat(coords)
          .setPopup(
            new mapboxgl.Popup({ offset: 25 })
              .setHTML(`
                <div style="padding: 8px;">
                  <h3 style="margin: 0 0 4px 0; font-weight: 600;">${region.name}</h3>
                  <p style="margin: 0; font-size: 12px; color: #666;">${region.description}</p>
                </div>
              `)
          )
          .addTo(map.current!);

        el.addEventListener('click', () => {
          navigate(`/ai-policy-atlas/${region.slug}`);
        });
      });
    });

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [mapToken, regions, navigate]);

  if (!mapToken) {
    return (
      <div className="w-full h-[500px] bg-muted rounded-lg flex items-center justify-center">
        <p className="text-muted-foreground">Loading map...</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-[500px] rounded-lg overflow-hidden shadow-lg">
      <div ref={mapContainer} className="absolute inset-0" />
      <div className="absolute bottom-4 left-4 bg-background/95 backdrop-blur px-4 py-2 rounded-md shadow-md">
        <p className="text-sm text-muted-foreground">Click markers to explore regions</p>
      </div>
    </div>
  );
};

export default PolicyMap;
