import React, { Suspense, useState, useEffect, useRef } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Stage, useGLTF, Environment, ContactShadows, PerspectiveCamera } from '@react-three/drei';
import { AlertCircle, Loader2, Moon, Sun } from 'lucide-react';
import * as THREE from 'three';

const STATUS_COLORS: Record<string, string> = {
  available: '#10b981',
  reserved: '#f59e0b',
  sold: '#ef4444',
};

function Model({ url, onUnitSelect, selectedUnitId, onError, units }: { 
  url: string; 
  onUnitSelect: (id: string) => void;
  selectedUnitId?: string;
  onError: () => void;
  units: any[];
}) {
  const modelUrl = url && url.startsWith('http') ? url : 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Box/glTF-Binary/Box.glb';
  
  const { scene } = useGLTF(modelUrl);

  useEffect(() => {
    if (scene) {
      scene.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          const meshName = child.name.toLowerCase();
          const parentName = child.parent?.name.toLowerCase() || '';
          
          // Find if this mesh or its parent is a unit from our list
          const unit = units.find(u => {
            const unitId = u.id.toLowerCase();
            // SketchUp often uses # for instances (e.g., Unit_13#1)
            return meshName === unitId || 
                   meshName.startsWith(unitId + '_') || 
                   meshName.startsWith(unitId + ' ') ||
                   meshName.startsWith(unitId + '#') ||
                   parentName === unitId ||
                   parentName.startsWith(unitId + '_') ||
                   parentName.startsWith(unitId + '#');
          });

          if (unit) {
            const isSelected = selectedUnitId?.toLowerCase() === unit.id.toLowerCase();
            
            child.material = child.material.clone();
            child.material.transparent = true;
            // 80% more transparent than 0.6 is ~0.12.
            child.material.opacity = isSelected ? 0.9 : 0.12;
            
            const statusColor = STATUS_COLORS[unit.status] || '#cccccc';
            child.material.color = new THREE.Color(statusColor);
            
            if (isSelected) {
              child.material.emissive = new THREE.Color(statusColor);
              child.material.emissiveIntensity = 1.0;
            } else {
              child.material.emissiveIntensity = 0;
            }
            
            // Explicitly mark as interactive
            child.userData.unitId = unit.id;
            child.raycast = THREE.Mesh.prototype.raycast;
          } else {
            // Building structure or surroundings: ignore raycasting
            child.raycast = () => null;

            // Enhance surrounding buildings: reduce reflections and make them look professional
            if (child.material) {
              child.material = child.material.clone();
              // Reduce reflections by increasing roughness and decreasing metalness
              if ('roughness' in child.material) (child.material as any).roughness = 1;
              if ('metalness' in child.material) (child.material as any).metalness = 0;
              
              // Ensure surrounding buildings have a clean, professional look
              // without changing the core building's transparency as requested.
              // We only apply this to meshes that are clearly part of the environment
              if (meshName.includes('surrounding') || meshName.includes('context') || meshName.includes('env')) {
                child.material.color = new THREE.Color('#f5f5f5');
              }
            }
          }
        }
      });
    }
  }, [scene, selectedUnitId, units]);

  if (!scene) return null;

  return (
    <primitive 
      object={scene} 
      onClick={(e: any) => {
        e.stopPropagation();
        // The raycaster will only hit objects with raycast != null (our units)
        let target = e.object;
        while (target && target !== scene) {
          if (target.userData.unitId) {
            onUnitSelect(target.userData.unitId);
            return;
          }
          // Fallback to name matching if userData is lost
          const name = target.name.toLowerCase();
          const unit = units.find(u => {
            const uid = u.id.toLowerCase();
            return name === uid || name.startsWith(uid + '_') || name.startsWith(uid + '#');
          });
          if (unit) {
            onUnitSelect(unit.id);
            return;
          }
          target = target.parent;
        }
      }}
    />
  );
}

class ThreeErrorBoundary extends React.Component<{ children: React.ReactNode; fallback: React.ReactNode }, { hasError: boolean }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

export default function ThreeViewer({ modelUrl, onUnitSelect, selectedUnitId, units, darkMode }: { 
  modelUrl: string;
  onUnitSelect: (id: string) => void;
  selectedUnitId?: string;
  units: any[];
  darkMode?: boolean;
}) {
  const [error, setError] = useState(false);
  const [viewerDarkMode, setViewerDarkMode] = useState(darkMode ?? false);

  useEffect(() => {
    setViewerDarkMode(darkMode ?? false);
  }, [darkMode]);

  useEffect(() => {
    setError(false);
  }, [modelUrl]);

  const errorFallback = (
    <div className="w-full h-full flex flex-col items-center justify-center bg-neutral-900 text-white p-6 text-center" dir="rtl">
      <AlertCircle size={48} className="text-red-500 mb-4" />
      <h3 className="text-lg font-bold mb-2">المعاينة ثلاثية الأبعاد غير متوفرة</h3>
      <p className="text-sm text-neutral-400 max-w-xs mb-4">
        فشل تحميل نموذج المبنى. تأكد من تسمية العناصر بمعرفات الوحدات الصحيحة.
      </p>
      {modelUrl && (
        <div className="text-[10px] font-mono text-neutral-500 break-all bg-black/30 p-2 rounded-lg">
          الرابط: {modelUrl}
        </div>
      )}
    </div>
  );

  return (
    <div className="w-full h-[600px] bg-white dark:bg-neutral-900 rounded-3xl overflow-hidden relative shadow-2xl border border-neutral-200 dark:border-white/10">
      {error ? errorFallback : (
        <ThreeErrorBoundary fallback={errorFallback}>
          <Canvas 
            shadows 
            dpr={[1, 2]} 
            camera={{ position: [40.5, 40.5, 40.5], fov: 40 }}
            onPointerMissed={() => onUnitSelect('')}
          >
            <color attach="background" args={[viewerDarkMode ? '#171717' : '#ffffff']} />
            <Suspense fallback={null}>
              <Stage environment={viewerDarkMode ? "night" : "warehouse"} intensity={0.5} adjustCamera={false}>
                <Model 
                  url={modelUrl} 
                  onUnitSelect={onUnitSelect} 
                  selectedUnitId={selectedUnitId}
                  onError={() => setError(true)} 
                  units={units}
                />
              </Stage>
              <OrbitControls 
                enableDamping 
                dampingFactor={0.03}
                rotateSpeed={0.8}
                makeDefault
                minDistance={35}
                maxDistance={80}
                maxPolarAngle={Math.PI / 2.3}
                minPolarAngle={Math.PI / 6}
              />
              <Environment preset={viewerDarkMode ? "night" : "warehouse"} />
              <ContactShadows position={[0, -1, 0]} opacity={viewerDarkMode ? 0.4 : 0.2} scale={20} blur={2.5} far={4.5} />
              <ambientLight intensity={viewerDarkMode ? 0.3 : 0.7} />
              <directionalLight position={[10, 10, 5]} intensity={viewerDarkMode ? 0.5 : 1} castShadow />
            </Suspense>
          </Canvas>
        </ThreeErrorBoundary>
      )}
      
      <div className="absolute top-6 right-6 flex flex-col gap-2 items-end" dir="rtl">
        <div className="bg-white/80 dark:bg-black/50 backdrop-blur-md px-4 py-2 rounded-2xl text-[10px] text-neutral-900 dark:text-white font-bold uppercase tracking-widest border border-neutral-200 dark:border-white/10 shadow-xl">
          انقر على وحدة لاستكشافها
        </div>
        <button
          onClick={() => setViewerDarkMode(!viewerDarkMode)}
          className="p-3 bg-white/80 dark:bg-black/50 backdrop-blur-md rounded-2xl border border-neutral-200 dark:border-white/10 shadow-xl text-neutral-900 dark:text-white hover:scale-105 active:scale-95 transition-all"
          title={viewerDarkMode ? "الوضع النهاري" : "الوضع الليلي"}
        >
          {viewerDarkMode ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>

      <div className="absolute bottom-6 left-6 bg-black/5 dark:bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-black/5 dark:border-white/10 text-neutral-500 dark:text-white/50 text-[10px] uppercase tracking-tighter text-right" dir="rtl">
        <p>دوران: نقر يسار</p>
        <p>تحريك: نقر يمين</p>
        <p>تكبير: تمرير</p>
      </div>
    </div>
  );
}
