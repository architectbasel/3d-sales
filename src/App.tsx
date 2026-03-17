import React, { useState, useEffect } from 'react';
import { db, auth } from './firebase';
import { collection, onSnapshot, query, orderBy, doc, setDoc, getDoc, where } from 'firebase/firestore';
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';
import { Unit, Project, Client } from './types';
import ThreeViewer from './components/ThreeViewer';
import UnitCard from './components/UnitCard';
import AdminPanel from './components/AdminPanel';
import { getUnitInsights } from './services/aiService';
import { fetchUnitsFromCSV } from './services/csvService';
import { 
  Building2, 
  LayoutGrid, 
  Sparkles, 
  ChevronRight, 
  Settings as SettingsIcon,
  LogOut,
  LogIn,
  Info,
  ExternalLink,
  Map as MapIcon,
  RefreshCw,
  X,
  MessageCircle,
  Maximize2,
  ChevronDown,
  Sofa,
  Bath,
  Bed,
  UserCheck,
  CookingPot,
  Users,
  Waves,
  Utensils,
  Moon,
  Sun,
  Languages,
  Share2,
  Copy,
  Check,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";
import { useTranslation } from 'react-i18next';

export default function App() {
  const { t, i18n } = useTranslation();
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [aiInsight, setAiInsight] = useState<string>("");
  const [loadingAi, setLoadingAi] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [sortBy, setSortBy] = useState<'status' | 'price' | 'area'>('status');
  const [showFloorPlanModal, setShowFloorPlanModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const sortedUnits = [...units].sort((a, b) => {
    if (sortBy === 'status') {
      const statusOrder = { available: 0, reserved: 1, sold: 2 };
      return statusOrder[a.status] - statusOrder[b.status];
    }
    if (sortBy === 'price') {
      return a.price - b.price;
    }
    if (sortBy === 'area') {
      return b.area - a.area;
    }
    return 0;
  });

  const generateAiInsight = async (unit: Unit) => {
    if (!unit) return;
    setLoadingAi(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Analyze this real estate unit for investment potential: ${JSON.stringify(unit)}. Provide a concise summary in ${i18n.language === 'ar' ? 'Arabic' : 'English'}.`,
      });
      setAiInsight(response.text || "");
    } catch (error) {
      console.error("AI Analysis Error:", error);
      setAiInsight(i18n.language === 'ar' ? "فشل التحليل. يرجى المحاولة مرة أخرى." : "Analysis failed. Please try again.");
    } finally {
      setLoadingAi(false);
    }
  };
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' || 
        (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });

    // Safety timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      setLoading(false);
    }, 10000);

    // Fetch all projects
    const unsubscribeProjects = onSnapshot(collection(db, 'projects'), (snapshot) => {
      const projectsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project));
      setProjects(projectsData);
      
      // Set first project as active if none selected or if active project was deleted
      if (projectsData.length > 0) {
        setActiveProject(prev => {
          if (!prev || !projectsData.find(p => p.id === prev.id)) {
            return projectsData[0];
          }
          return prev;
        });
      }
      setLoading(false);
      clearTimeout(timeout);
    }, (error) => {
      console.error("Error fetching projects:", error);
      setLoading(false);
      clearTimeout(timeout);
    });

    return () => {
      unsubscribeAuth();
      unsubscribeProjects();
      clearTimeout(timeout);
    };
  }, []);

  useEffect(() => {
    if (activeProject) {
      setLoading(true);
      const q = query(collection(db, `projects/${activeProject.id}/units`), orderBy('updatedAt', 'desc'));
      const unsubscribeUnits = onSnapshot(q, (snapshot) => {
        const unitsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Unit));
        setUnits(unitsData);
        setLoading(false);
      }, (error) => {
        console.error("Firestore Snapshot Error:", error);
        setLoading(false);
      });
      return () => unsubscribeUnits();
    }
  }, [activeProject]);

  useEffect(() => {
    if (selectedUnit) {
      handleGetAiInsight(selectedUnit);
    }
  }, [selectedUnit]);

  const handleGetAiInsight = async (unit: Unit) => {
    setLoadingAi(true);
    const insight = await getUnitInsights(unit);
    setAiInsight(insight);
    setLoadingAi(false);
  };

  const syncWithCSV = async () => {
    if (!activeProject?.csvUrl) {
      alert(t('please_configure_csv'));
      return;
    }
    setSyncing(true);
    try {
      const csvUnits = await fetchUnitsFromCSV(activeProject.csvUrl);
      
      if (csvUnits.length === 0) {
        alert("لم يتم العثور على وحدات في ملف CSV. يرجى التأكد من صحة الرابط وتنسيق الملف.");
        return;
      }

      let updatedCount = 0;
      for (const unit of csvUnits) {
        const unitRef = doc(db, `projects/${activeProject.id}/units`, unit.id);
        const existingDoc = await getDoc(unitRef);
        
        const dataToSave = {
          ...unit,
          projectId: activeProject.id,
          updatedAt: new Date().toISOString()
        };

        // If unit exists, we still want to update its status from CSV
        // Previously we were preserving the existing status, which prevented CSV updates from reflecting
        await setDoc(unitRef, dataToSave, { merge: true });
        updatedCount++;
      }
      alert(`${t('sync_completed')}: تم تحديث ${updatedCount} وحدة.`);
    } catch (error: any) {
      console.error("Sync error:", error);
      alert(`${t('sync_failed')}: ${error.message || 'خطأ غير معروف'}`);
    } finally {
      setSyncing(false);
    }
  };

  const toggleLanguage = () => {
    const newLang = i18n.language === 'ar' ? 'en' : 'ar';
    i18n.changeLanguage(newLang);
    document.documentElement.dir = newLang === 'ar' ? 'rtl' : 'ltr';
  };

  const login = () => signInWithPopup(auth, new GoogleAuthProvider());
  const logout = () => auth.signOut();

  const isGlobalAdmin = user?.email === "architect.basel@gmail.com";
  const isProjectAdmin = activeProject?.admins?.includes(user?.email || '');
  const isAdmin = isGlobalAdmin || isProjectAdmin;

  if (loading && projects.length === 0) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-neutral-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin" />
          <p className="text-white/50 font-mono text-xs tracking-widest uppercase">{t('analyzing')}</p>
        </div>
      </div>
    );
  }

  const statusTranslations = {
    available: 'متاح',
    reserved: 'محجوز',
    sold: 'مباع'
  };

  return (
    <div className={`min-h-screen bg-[#F5F5F7] dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 font-sans selection:bg-black dark:selection:bg-white selection:text-white dark:selection:text-black transition-colors duration-300`} dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
      {/* Navigation */}
      <nav className="sticky top-0 z-40 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl border-b border-neutral-200 dark:border-neutral-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-black dark:bg-white p-2 rounded-xl">
              <Building2 className="text-white dark:text-neutral-900" size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <div className="relative group">
                  <select 
                    className="text-xl font-bold tracking-tight bg-transparent border-none outline-none cursor-pointer appearance-none pl-8 dark:text-white"
                    value={activeProject?.id || ''}
                    onChange={(e) => {
                      const p = projects.find(proj => proj.id === e.target.value);
                      if (p) {
                        setActiveProject(p);
                        setSelectedUnit(null);
                      }
                    }}
                  >
                    {projects.map(p => (
                      <option key={p.id} value={p.id} className="dark:bg-neutral-900">{p.name}</option>
                    ))}
                    {projects.length === 0 && <option value="" className="dark:bg-neutral-900">{t('no_projects')}</option>}
                  </select>
                  <ChevronDown className="absolute left-0 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" size={16} />
                </div>
              </div>
              <p className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold">{t('advanced_real_estate_ai')}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={toggleLanguage}
              className="p-2 text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white transition-colors"
              title={i18n.language === 'ar' ? 'English' : 'العربية'}
            >
              <Languages size={20} />
            </button>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white transition-colors"
            >
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button
              onClick={() => setShowShareModal(true)}
              className="p-2 text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white transition-colors"
              title={t('share')}
            >
              <Share2 size={20} />
            </button>
            {isAdmin && (
              <>
                <button 
                  onClick={syncWithCSV}
                  disabled={syncing}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full text-sm font-semibold hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-all disabled:opacity-50"
                >
                  <RefreshCw size={16} className={syncing ? "animate-spin" : ""} />
                  <span className="hidden sm:inline">{syncing ? t('syncing') : t('sync_data')}</span>
                </button>
                <button 
                  onClick={() => setShowAdmin(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-full text-sm font-semibold transition-all dark:text-white"
                >
                  <SettingsIcon size={16} />
                  <span className="hidden sm:inline">{t('settings')}</span>
                </button>
              </>
            )}
            
            {user ? (
              <div className="flex items-center gap-3">
                <img src={user.photoURL || ''} className="w-8 h-8 rounded-full border border-neutral-200 dark:border-neutral-700" alt="Profile" />
                <button onClick={logout} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors text-neutral-500 dark:text-neutral-400">
                  <LogOut size={18} />
                </button>
              </div>
            ) : (
              <button 
                onClick={login}
                className="flex items-center gap-2 px-6 py-2 bg-black dark:bg-white text-white dark:text-black rounded-full text-sm font-bold hover:scale-105 active:scale-95 transition-all"
              >
                <LogIn size={16} />
                <span>{t('login')}</span>
              </button>
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-6 lg:p-10 grid lg:grid-cols-12 gap-10">
        {/* Left Column: 3D Viewer & AI */}
        <div className="lg:col-span-12 xl:col-span-8 space-y-8">
          <div className="relative group">
            <ThreeViewer 
              modelUrl={activeProject?.modelUrl || ''} 
              units={units}
              onUnitSelect={(id) => {
                if (!id) {
                  setSelectedUnit(null);
                  return;
                }
                const unit = units.find(u => u.id.toLowerCase() === id.toLowerCase());
                if (unit) setSelectedUnit(unit);
              }}
              selectedUnitId={selectedUnit?.id}
              darkMode={darkMode}
            />
            
            <AnimatePresence mode="wait">
              {selectedUnit && (
                  <motion.div 
                  key={selectedUnit.id}
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  className="absolute top-6 right-6 bg-white/70 backdrop-blur-2xl p-4 rounded-[32px] shadow-[0_25px_60px_rgba(0,0,0,0.2)] border border-white/50 w-[320px] z-10 text-right"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between pt-1 px-1">
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => setSelectedUnit(null)}
                          className="p-2 hover:bg-black/5 rounded-full transition-all text-neutral-600 hover:text-black hover:rotate-90"
                        >
                          <X size={18} />
                        </button>
                        <div>
                          <h2 className="text-xl font-extrabold text-neutral-900 leading-tight">{selectedUnit.name || selectedUnit.id}</h2>
                          <p className="text-neutral-400 text-[10px] font-bold uppercase tracking-tighter">
                            {selectedUnit.floor.toString().includes('الدور') ? selectedUnit.floor : `الدور ${selectedUnit.floor}`}
                          </p>
                        </div>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-[13px] font-black uppercase tracking-tighter shadow-sm border border-white/20 ${
                        selectedUnit.status === 'available' ? 'bg-emerald-500 text-white' : 
                        selectedUnit.status === 'reserved' ? 'bg-amber-400 text-white' : 
                        'bg-red-500 text-white'
                      }`}>
                        {statusTranslations[selectedUnit.status]}
                      </div>
                    </div>

                    <p className="text-neutral-600 text-sm leading-relaxed line-clamp-3 px-1">{selectedUnit.description}</p>
                    
                    <div className="py-2 border-y border-neutral-100/50">
                      <div className="flex flex-wrap justify-center gap-x-3 gap-y-1.5 text-[12px] font-bold text-neutral-500">
                        {[
                          selectedUnit.details?.bedroomsCount && (
                            <div key="bed" className="flex items-center gap-1" title={`عدد ${selectedUnit.details.bedroomsCount} غرف نوم`}>
                              <Bed size={14} className="text-neutral-400" />
                              <span>{selectedUnit.details.bedroomsCount}</span>
                            </div>
                          ),
                          selectedUnit.details?.bathroomsCount && (
                            <div key="bath" className="flex items-center gap-1" title={`عدد ${selectedUnit.details.bathroomsCount} دورة مياه`}>
                              <Bath size={14} className="text-neutral-400" />
                              <span>{selectedUnit.details.bathroomsCount}</span>
                            </div>
                          ),
                          selectedUnit.details?.livingRoom && (
                            <div key="sofa" className="flex items-center gap-1" title={`عدد ${selectedUnit.details.livingRoom} صالة`}>
                              <Sofa size={14} className="text-neutral-400" />
                              <span>{selectedUnit.details.livingRoom}</span>
                            </div>
                          ),
                          selectedUnit.details?.kitchen && (
                            <div key="kitchen" className="flex items-center gap-1" title={`عدد ${selectedUnit.details.kitchen} مطبخ`}>
                              <CookingPot size={14} className="text-neutral-400" />
                              <span>{selectedUnit.details.kitchen}</span>
                            </div>
                          ),
                          selectedUnit.details?.majlis && (
                            <div key="majlis" className="flex items-center gap-1" title={`عدد ${selectedUnit.details.majlis} مجلس`}>
                              <Users size={14} className="text-neutral-400" />
                              <span>{selectedUnit.details.majlis}</span>
                            </div>
                          ),
                          selectedUnit.details?.diningRoom && (
                            <div key="dining" className="flex items-center gap-1" title={`عدد ${selectedUnit.details.diningRoom} غرفة طعام`}>
                              <Utensils size={14} className="text-neutral-400" />
                              <span>{selectedUnit.details.diningRoom}</span>
                            </div>
                          ),
                          selectedUnit.details?.maidRoom && (
                            <div key="maid" className="flex items-center gap-1" title={`عدد ${selectedUnit.details.maidRoom} غرفة خادمة`}>
                              <UserCheck size={14} className="text-neutral-400" />
                              <span>{selectedUnit.details.maidRoom}</span>
                            </div>
                          ),
                          selectedUnit.details?.terrace && (
                            <div key="terrace" className="flex items-center gap-1" title={`عدد ${selectedUnit.details.terrace} تراس/شرفة`}>
                              <Sun size={14} className="text-neutral-400" />
                              <span>{selectedUnit.details.terrace}</span>
                            </div>
                          ),
                          selectedUnit.details?.swimmingPool && (
                            <div key="pool" className="flex items-center gap-1" title={`عدد ${selectedUnit.details.swimmingPool} مسبح`}>
                              <Waves size={14} className="text-neutral-400" />
                              <span>{selectedUnit.details.swimmingPool}</span>
                            </div>
                          )
                        ].filter(Boolean).reduce((acc: any[], curr, idx, arr) => {
                          acc.push(curr);
                          if (idx < arr.length - 1) {
                            acc.push(<span key={`sep-${idx}`} className="text-neutral-300 font-normal">+</span>);
                          }
                          return acc;
                        }, [])}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-neutral-50/80 py-1 px-3 rounded-xl border border-neutral-100/50">
                        <p className="text-[10px] text-neutral-400 uppercase font-black mb-1">السعر</p>
                        <p className="text-base font-black text-neutral-900">{selectedUnit.price.toLocaleString()} ر.س</p>
                      </div>
                      <div className="bg-neutral-50/80 py-1.5 px-3 rounded-xl border border-neutral-100/50">
                        <p className="text-[10px] text-neutral-400 uppercase font-black mb-1">المساحة</p>
                        <p className="text-base font-black text-neutral-900">{selectedUnit.area} م²</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {selectedUnit.floorPlanUrl && (
                        <div 
                          onClick={() => setShowFloorPlanModal(true)}
                          className="w-full h-36 bg-neutral-50/80 rounded-xl border border-neutral-100/50 overflow-hidden flex items-center justify-center p-2 relative group cursor-zoom-in"
                        >
                          <img 
                            src={selectedUnit.floorPlanUrl} 
                            alt="Floor Plan" 
                            className="max-w-full max-h-full object-contain relative z-10 transition-all duration-500 group-hover:scale-105"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = 'https://placehold.co/600x400/f5f5f5/a3a3a3?text=Floor+Plan+Not+Available';
                            }}
                          />
                          <div className="absolute inset-0 flex items-center justify-center text-neutral-100 -z-0">
                            <MapIcon size={40} />
                          </div>
                          <div className="absolute top-2 left-2 bg-white/80 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-20">
                            <Maximize2 size={14} className="text-neutral-600" />
                          </div>
                        </div>
                      )}
                      
                      <div className="grid grid-cols-1 gap-2 pt-1">
                        <button 
                          onClick={() => {
                            const projectName = activeProject?.name || 'مشروع عقاري';
                            const unitId = selectedUnit.name || selectedUnit.id;
                            const message = encodeURIComponent(`أرغب في الحصول على مزيد من المعلومات حول المشروع: ${projectName}، الوحدة: ${unitId}`);
                            const whatsappNumber = activeProject?.whatsappNumber || '966500000000'; 
                            window.open(`https://wa.me/${whatsappNumber}?text=${message}`, '_blank');
                          }}
                          className="w-full flex items-center justify-center gap-2 py-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 active:scale-[0.98]"
                        >
                          <MessageCircle size={18} />
                          <span className="text-sm font-black">مزيد من المعلومات</span>
                        </button>

                        {selectedUnit.vrTourUrl && (
                          <button 
                            onClick={() => window.open(selectedUnit.vrTourUrl, '_blank')}
                            className="w-full flex items-center justify-center gap-2 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 active:scale-[0.98]"
                          >
                            <ExternalLink size={18} />
                            <span className="text-sm font-black">جولة افتراضية</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* AI Insights Section removed */}
        </div>

        {/* Right Column: Unit List */}
        <div className="lg:col-span-12 xl:col-span-4 space-y-4 text-right">
          <div className="flex items-center gap-6 px-1" dir="rtl">
            <div className="flex items-center gap-2">
              <LayoutGrid size={18} className="text-neutral-400" />
              <h3 className="font-black text-xl dark:text-white">الوحدات</h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest whitespace-nowrap">ترتيب حسب:</span>
              <select 
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="text-[10px] bg-neutral-100 dark:bg-neutral-800 px-2 py-1 rounded-lg border-none outline-none cursor-pointer text-neutral-600 dark:text-neutral-400 font-bold uppercase tracking-wider hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
              >
                <option value="status">الحالة</option>
                <option value="price">السعر</option>
                <option value="area">المساحة</option>
              </select>
            </div>
            <div className="mr-auto">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">{units.length} {t('units')}</span>
            </div>
          </div>

          <div className="space-y-2 h-[calc(100vh-220px)] overflow-y-auto pl-2 custom-scrollbar">
            {units.length === 0 ? (
              <div className="p-12 text-center bg-white dark:bg-neutral-900 rounded-[32px] border border-dashed border-neutral-300 dark:border-neutral-700">
                <Info className="mx-auto mb-4 text-neutral-300" size={48} />
                <p className="text-neutral-500 dark:text-neutral-400 font-medium">{t('no_units_available')}</p>
                {isAdmin && (
                  <button 
                    onClick={syncWithCSV}
                    className="mt-4 text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    {t('sync_data')}
                  </button>
                )}
              </div>
            ) : (
              sortedUnits.map(unit => (
                <UnitCard 
                  key={unit.id}
                  unit={unit}
                  isSelected={selectedUnit?.id === unit.id}
                  onClick={() => setSelectedUnit(unit)}
                />
              ))
            )}
          </div>
        </div>
      </main>

      {/* Share Modal */}
      <AnimatePresence>
        {showShareModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
            onClick={() => setShowShareModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white dark:bg-neutral-900 rounded-[32px] w-full max-w-lg overflow-hidden shadow-2xl border border-neutral-200 dark:border-white/10"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div className="bg-indigo-100 dark:bg-indigo-900/30 p-3 rounded-2xl">
                      <Share2 className="text-indigo-600 dark:text-indigo-400" size={24} />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black dark:text-white">{t('share_project')}</h2>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">{t('share_description')}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowShareModal(false)}
                    className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors dark:text-white"
                  >
                    <X size={24} />
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Direct Link */}
                  <div className="space-y-2">
                    <label className="text-xs font-black text-neutral-400 uppercase tracking-widest">{t('project_link')}</label>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        readOnly 
                        value={window.location.href}
                        className="flex-1 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm dark:text-white outline-none"
                      />
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(window.location.href);
                          setCopied(true);
                          setTimeout(() => setCopied(false), 2000);
                        }}
                        className="bg-black dark:bg-white text-white dark:text-black px-4 rounded-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center"
                      >
                        {copied ? <Check size={18} /> : <Copy size={18} />}
                      </button>
                    </div>
                  </div>

                  {/* Embed Code */}
                  <div className="space-y-2">
                    <label className="text-xs font-black text-neutral-400 uppercase tracking-widest">{t('embed_code')}</label>
                    <div className="relative">
                      <textarea 
                        readOnly 
                        rows={4}
                        value={`<iframe src="${window.location.href}" width="100%" height="700px" frameborder="0" style="border-radius: 24px; box-shadow: 0 20px 50px rgba(0,0,0,0.1);"></iframe>`}
                        className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-white/10 rounded-xl px-4 py-3 text-xs font-mono dark:text-white outline-none resize-none"
                      />
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(`<iframe src="${window.location.href}" width="100%" height="700px" frameborder="0" style="border-radius: 24px; box-shadow: 0 20px 50px rgba(0,0,0,0.1);"></iframe>`);
                          setCopied(true);
                          setTimeout(() => setCopied(false), 2000);
                        }}
                        className="absolute top-2 right-2 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 p-2 rounded-lg transition-all dark:text-white"
                      >
                        {copied ? <Check size={14} /> : <Copy size={14} />}
                      </button>
                    </div>
                    <p className="text-[10px] text-neutral-400">{t('copy_embed_hint')}</p>
                  </div>

                  {window.location.href.includes('-dev-') && (
                    <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/30 rounded-2xl flex items-start gap-3">
                      <AlertCircle className="text-amber-600 dark:text-amber-400 shrink-0" size={18} />
                      <p className="text-[11px] text-amber-800 dark:text-amber-200 leading-relaxed font-medium">
                        {t('dev_url_warning')}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floor Plan Zoom Modal */}
      <AnimatePresence>
        {showFloorPlanModal && selectedUnit?.floorPlanUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[100] flex items-center justify-center p-4 md:p-12"
            onClick={() => setShowFloorPlanModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-5xl w-full h-full flex items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setShowFloorPlanModal(false)}
                className="absolute -top-12 right-0 md:-right-12 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all group"
              >
                <X size={24} className="group-hover:rotate-90 transition-transform" />
              </button>
              
              <div className="w-full h-full bg-white/5 rounded-3xl overflow-hidden flex items-center justify-center p-4">
                <img
                  src={selectedUnit.floorPlanUrl}
                  alt="Floor Plan Zoomed"
                  className="max-w-full max-h-full object-contain shadow-2xl"
                  referrerPolicy="no-referrer"
                />
              </div>
              
              <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 text-white/50 text-sm font-bold uppercase tracking-widest">
                {selectedUnit.name || selectedUnit.id} &bull; Floor Plan
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Admin Modal */}
      <AnimatePresence>
        {showAdmin && (
          <AdminPanel 
            onClose={() => setShowAdmin(false)} 
            projects={projects}
            activeProjectId={activeProject?.id}
            isGlobalAdmin={isGlobalAdmin}
          />
        )}
      </AnimatePresence>

      <footer className="max-w-7xl mx-auto p-12 border-t border-neutral-200 dark:border-neutral-800 text-center">
        <p className="text-neutral-400 dark:text-neutral-500 text-[10px] font-bold uppercase tracking-[0.4em]">
          &copy; 2026 {activeProject?.name || "AXON"} &bull; {t('advanced_real_estate_vision')}
        </p>
      </footer>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: ${darkMode ? '#444' : '#E5E5E5'};
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: ${darkMode ? '#555' : '#D1D1D1'};
        }
      `}</style>
    </div>
  );
}
