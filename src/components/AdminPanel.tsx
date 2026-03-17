import React, { useState, useRef, useEffect } from 'react';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp, doc, setDoc, writeBatch, onSnapshot, deleteDoc } from 'firebase/firestore';
import { Plus, X, Save, Settings, LayoutGrid, Database, RefreshCw, Upload, FileJson, FileCode, Trash2, FolderPlus, CheckCircle2, AlertCircle } from 'lucide-react';
import { Project, Unit } from '../types';
import * as XLSX from 'xlsx';
import { fetchUnitsFromCSV } from '../services/csvService';

export default function AdminPanel({ activeProjectId, onClose, projects: initialProjects, isGlobalAdmin }: { 
  activeProjectId: string | null; 
  onClose: () => void;
  projects: Project[];
  isGlobalAdmin: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'units' | 'projects' | 'bulk'>('projects');
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [units, setUnits] = useState<Unit[]>([]);
  const [editingUnitId, setEditingUnitId] = useState<string | null>(null);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const glbInputRef = useRef<HTMLInputElement>(null);
  const excelInputRef = useRef<HTMLInputElement>(null);
  const projectGlbInputRef = useRef<HTMLInputElement>(null);

  const [projectFormData, setProjectFormData] = useState({
    name: '',
    modelUrl: '',
    csvUrl: '',
    description: '',
    whatsappNumber: ''
  });

  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');

  const [unitFormData, setUnitFormData] = useState({
    name: '',
    price: 0,
    status: 'available',
    area: 0,
    bedrooms: 1,
    bathrooms: 1,
    floor: 1,
    description: '',
    modelUrl: '',
    floorPlanUrl: '',
    vrTourUrl: '',
    interestLink: ''
  });

  useEffect(() => {
    setProjects(initialProjects);
  }, [initialProjects]);

  useEffect(() => {
    if (activeProjectId && activeTab === 'units') {
      const unsubscribe = onSnapshot(collection(db, `projects/${activeProjectId}/units`), (snapshot) => {
        const unitsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Unit));
        setUnits(unitsData);
      });
      return () => unsubscribe();
    }
  }, [activeProjectId, activeTab]);

  const handleTestCSV = async () => {
    if (!projectFormData.csvUrl) {
      alert("يرجى إدخال رابط CSV أولاً");
      return;
    }
    setTestStatus('testing');
    setTestMessage('جاري اختبار الرابط...');
    try {
      const units = await fetchUnitsFromCSV(projectFormData.csvUrl);
      if (units.length > 0) {
        setTestStatus('success');
        setTestMessage(`تم العثور على ${units.length} وحدة بنجاح!`);
      } else {
        setTestStatus('error');
        setTestMessage('الرابط صحيح ولكن لم يتم العثور على وحدات. تأكد من أسماء الأعمدة.');
      }
    } catch (error) {
      console.error("CSV Test Error:", error);
      setTestStatus('error');
      setTestMessage('فشل الاتصال بالرابط. تأكد من أن الرابط منشور كـ CSV ومتاح للجميع.');
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isGlobalAdmin) return;
    setLoading(true);
    try {
      if (editingProjectId) {
        await setDoc(doc(db, 'projects', editingProjectId), {
          ...projectFormData,
          updatedAt: new Date().toISOString()
        }, { merge: true });
        setEditingProjectId(null);
      } else {
        await addDoc(collection(db, 'projects'), {
          ...projectFormData,
          createdAt: new Date().toISOString()
        });
      }
      setProjectFormData({ name: '', modelUrl: '', csvUrl: '', description: '', whatsappNumber: '' });
    } catch (error) {
      console.error("Error creating project:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditProject = (project: Project) => {
    setProjectFormData({
      name: project.name,
      modelUrl: project.modelUrl,
      csvUrl: project.csvUrl || '',
      description: project.description || '',
      whatsappNumber: project.whatsappNumber || ''
    });
    setEditingProjectId(project.id);
  };

  const handleDeleteProject = async (id: string) => {
    if (!isGlobalAdmin) return;
    if (!confirm("هل أنت متأكد من حذف هذا المشروع؟ سيتم حذف جميع الوحدات المرتبطة به.")) return;
    setLoading(true);
    try {
      await deleteDoc(doc(db, 'projects', id));
      alert("تم حذف المشروع.");
    } catch (error) {
      console.error("Error deleting project:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProjectId) {
      alert("يرجى اختيار مشروع أولاً.");
      return;
    }
    setLoading(true);
    try {
      const unitData = {
        ...unitFormData,
        projectId: activeProjectId,
        price: Number(unitFormData.price),
        area: Number(unitFormData.area),
        bedrooms: Number(unitFormData.bedrooms),
        bathrooms: Number(unitFormData.bathrooms),
        floor: Number(unitFormData.floor),
        updatedAt: serverTimestamp()
      };

      if (editingUnitId) {
        await setDoc(doc(db, `projects/${activeProjectId}/units`, editingUnitId), unitData, { merge: true });
        alert("تم تحديث الوحدة بنجاح!");
      } else {
        await addDoc(collection(db, `projects/${activeProjectId}/units`), unitData);
        alert("تم إضافة الوحدة بنجاح!");
      }

      setUnitFormData({
        name: '', price: 0, status: 'available', area: 0, bedrooms: 1, bathrooms: 1, floor: 1,
        description: '', modelUrl: '', floorPlanUrl: '', vrTourUrl: '', interestLink: ''
      });
      setEditingUnitId(null);
    } catch (error) {
      console.error("Error saving unit:", error);
      alert("فشل حفظ الوحدة.");
    } finally {
      setLoading(false);
    }
  };

  const handleEditUnit = (unit: Unit) => {
    setUnitFormData({
      name: unit.name || '',
      price: unit.price || 0,
      status: unit.status || 'available',
      area: unit.area || 0,
      bedrooms: Number(unit.bedrooms) || 1,
      bathrooms: Number(unit.bathrooms) || 1,
      floor: Number(unit.floor) || 1,
      description: unit.description || '',
      modelUrl: unit.modelUrl || '',
      floorPlanUrl: unit.floorPlanUrl || '',
      vrTourUrl: unit.vrTourUrl || '',
      interestLink: unit.interestLink || ''
    });
    setEditingUnitId(unit.id);
  };

  const handleDeleteUnit = async (unitId: string) => {
    if (!confirm("هل أنت متأكد من حذف هذه الوحدة؟")) return;
    setLoading(true);
    try {
      await deleteDoc(doc(db, `projects/${activeProjectId}/units`, unitId));
      alert("تم حذف الوحدة.");
    } catch (error) {
      console.error("Error deleting unit:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleGlbUpload = async (e: React.ChangeEvent<HTMLInputElement>, isProjectForm = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      if (data.url) {
        const newUrl = window.location.origin + data.url;
        if (isProjectForm) {
          setProjectFormData(prev => ({ ...prev, modelUrl: newUrl }));
        } else {
          setUnitFormData(prev => ({ ...prev, modelUrl: newUrl }));
        }
        alert("تم رفع ملف GLB بنجاح!");
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert("فشل رفع الملف.");
    } finally {
      setLoading(false);
    }
  };

  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeProjectId) return;

    setLoading(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

        const rows = data.slice(1);
        const batch = writeBatch(db);

        const unitsToUpload = rows.map((row, index) => {
          const id = String(row[0] || `UNIT_${index}`).trim();
          const statusRaw = String(row[1] || '').toLowerCase();
          
          let status: 'available' | 'reserved' | 'sold' = 'available';
          if (statusRaw.includes('محجوز') || statusRaw.includes('reserved')) status = 'reserved';
          if (statusRaw.includes('مباع') || statusRaw.includes('sold')) status = 'sold';

          const priceStr = String(row[3] || '0').replace(/[^0-9]/g, '');
          const price = parseInt(priceStr) || 0;

          const areaStr = String(row[5] || '0').replace(/[^0-9]/g, '');
          const area = parseInt(areaStr) || 0;

          return {
            id,
            name: id,
            status,
            price,
            area,
            floorPlanUrl: '', 
            vrTourUrl: '',
            description: row[7] || '', 
            floor: row[6] || '', 
            bedrooms: row[4] || '', 
            bathrooms: 0,
            interestLink: '',
            amenities: [],
            updatedAt: new Date().toISOString(),
            modelUrl: '',
            color: row[2] || '#00ff00',
            projectId: activeProjectId
          };
        });

        for (const unit of unitsToUpload) {
          const docRef = doc(db, `projects/${activeProjectId}/units`, unit.id);
          batch.set(docRef, unit);
        }

        await batch.commit();
        alert(`تم استيراد ${unitsToUpload.length} وحدة بنجاح!`);
      } catch (error) {
        console.error("Excel import error:", error);
        alert("فشل تحليل ملف Excel.");
      } finally {
        setLoading(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-[32px] w-full max-w-5xl overflow-hidden shadow-2xl flex h-[85vh]">
        {/* Sidebar */}
        <div className="w-72 bg-neutral-50 border-l border-neutral-100 p-6 flex flex-col gap-2">
          <div className="mb-8 text-right">
            <h2 className="text-xl font-bold">لوحة التحكم</h2>
            <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest">إدارة المشاريع والوحدات</p>
          </div>

          <button 
            onClick={() => setActiveTab('projects')}
            className={`flex items-center gap-3 p-4 rounded-2xl font-bold transition-all ${
              activeTab === 'projects' ? 'bg-black text-white' : 'hover:bg-neutral-200 text-neutral-500'
            }`}
          >
            <FolderPlus size={20} />
            <span>إدارة المشاريع</span>
          </button>

          <button 
            onClick={() => setActiveTab('units')}
            className={`flex items-center gap-3 p-4 rounded-2xl font-bold transition-all ${
              activeTab === 'units' ? 'bg-black text-white' : 'hover:bg-neutral-200 text-neutral-500'
            }`}
          >
            <LayoutGrid size={20} />
            <span>محرر الوحدات</span>
          </button>

          <button 
            onClick={() => setActiveTab('bulk')}
            className={`flex items-center gap-3 p-4 rounded-2xl font-bold transition-all ${
              activeTab === 'bulk' ? 'bg-black text-white' : 'hover:bg-neutral-200 text-neutral-500'
            }`}
          >
            <Upload size={20} />
            <span>الرفع الجماعي</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col overflow-hidden text-right">
          <div className="p-6 border-b border-neutral-100 flex justify-between items-center">
            <h3 className="text-lg font-bold">
              {activeTab === 'projects' ? 'إدارة المشاريع العقارية' : 
               activeTab === 'units' ? 'إضافة وحدة جديدة' : 'رفع البيانات جماعياً'}
            </h3>
            <button onClick={onClose} className="p-2 hover:bg-neutral-100 rounded-full transition-colors">
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
            {/* Hidden Inputs */}
            <input type="file" ref={glbInputRef} className="hidden" accept=".glb" onChange={(e) => handleGlbUpload(e, false)} />
            <input type="file" ref={projectGlbInputRef} className="hidden" accept=".glb" onChange={(e) => handleGlbUpload(e, true)} />
            <input type="file" ref={excelInputRef} className="hidden" accept=".xlsx, .xls, .csv" onChange={handleExcelUpload} />

            {activeTab === 'projects' ? (
              <div className="space-y-10">
                {isGlobalAdmin && (
                  <form onSubmit={handleCreateProject} className="bg-neutral-50 p-8 rounded-[32px] border border-neutral-100 space-y-6">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="font-bold text-lg">{editingProjectId ? 'تعديل المشروع' : 'إضافة مشروع جديد'}</h4>
                      {editingProjectId && (
                        <button 
                          type="button" 
                          onClick={() => {
                            setEditingProjectId(null);
                            setProjectFormData({ name: '', modelUrl: '', csvUrl: '', description: '', whatsappNumber: '' });
                          }}
                          className="text-xs font-bold text-neutral-400 hover:text-black"
                        >
                          إلغاء التعديل
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase text-neutral-400">اسم المشروع</label>
                        <input required className="w-full p-4 rounded-2xl border border-neutral-200" value={projectFormData.name} onChange={e => setProjectFormData({...projectFormData, name: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase text-neutral-400">رقم الواتساب (مثال: 966500000000)</label>
                        <input className="w-full p-4 rounded-2xl border border-neutral-200" value={projectFormData.whatsappNumber} onChange={e => setProjectFormData({...projectFormData, whatsappNumber: e.target.value})} placeholder="966500000000" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase text-neutral-400">رابط نموذج 3D (GLB)</label>
                        <div className="flex gap-2">
                          <input required className="flex-1 p-4 rounded-2xl border border-neutral-200" value={projectFormData.modelUrl} onChange={e => setProjectFormData({...projectFormData, modelUrl: e.target.value})} />
                          <button type="button" onClick={() => projectGlbInputRef.current?.click()} className="px-4 bg-white border border-neutral-200 rounded-2xl hover:bg-neutral-50"><Upload size={18} /></button>
                        </div>
                      </div>
                      <div className="space-y-2 col-span-2">
                        <label className="text-xs font-bold uppercase text-neutral-400">رابط ملف CSV (البيانات)</label>
                        <div className="flex gap-2">
                          <input 
                            className="flex-1 p-4 rounded-2xl border border-neutral-200" 
                            value={projectFormData.csvUrl} 
                            onChange={e => {
                              setProjectFormData({...projectFormData, csvUrl: e.target.value});
                              setTestStatus('idle');
                            }} 
                            placeholder="https://docs.google.com/spreadsheets/d/.../pub?output=csv" 
                          />
                          <button 
                            type="button"
                            onClick={handleTestCSV}
                            disabled={testStatus === 'testing' || !projectFormData.csvUrl}
                            className={`px-6 rounded-2xl font-bold flex items-center gap-2 transition-all ${
                              testStatus === 'success' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' :
                              testStatus === 'error' ? 'bg-red-50 text-red-600 border border-red-200' :
                              'bg-white border border-neutral-200 hover:bg-neutral-50'
                            }`}
                          >
                            {testStatus === 'testing' ? <RefreshCw size={18} className="animate-spin" /> : 
                             testStatus === 'success' ? <CheckCircle2 size={18} /> :
                             testStatus === 'error' ? <AlertCircle size={18} /> : null}
                            {testStatus === 'testing' ? 'جاري الاختبار...' : 'اختبار الرابط'}
                          </button>
                        </div>
                        {testMessage && (
                          <p className={`text-[10px] font-bold mt-1 ${
                            testStatus === 'success' ? 'text-emerald-600' : 'text-red-500'
                          }`}>
                            {testMessage}
                          </p>
                        )}
                      </div>
                    </div>
                    <button disabled={loading} className="bg-black text-white px-8 py-4 rounded-2xl font-bold flex items-center gap-2 hover:scale-105 transition-all disabled:opacity-50">
                      {editingProjectId ? <Save size={20} /> : <Plus size={20} />}
                      {editingProjectId ? 'حفظ التغييرات' : 'إنشاء المشروع'}
                    </button>
                  </form>
                )}

                <div className="space-y-4">
                  <h4 className="font-bold text-lg">المشاريع الحالية</h4>
                  <div className="grid grid-cols-1 gap-4">
                    {projects.map(p => (
                      <div key={p.id} className="bg-white p-6 rounded-2xl border border-neutral-200 flex justify-between items-center group">
                        <div>
                          <h5 className="font-bold text-lg">{p.name}</h5>
                          <p className="text-xs text-neutral-400 font-mono">{p.modelUrl.substring(0, 50)}...</p>
                          {p.csvUrl && <p className="text-[10px] text-emerald-600 font-bold mt-1">✓ مرتبط بملف بيانات</p>}
                        </div>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                          <button onClick={() => handleEditProject(p)} className="p-3 text-indigo-600 hover:bg-indigo-50 rounded-xl">
                            <Settings size={20} />
                          </button>
                          <button onClick={() => handleDeleteProject(p.id)} className="p-3 text-red-500 hover:bg-red-50 rounded-xl">
                            <Trash2 size={20} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : activeTab === 'bulk' ? (
              <div className="space-y-8 max-w-2xl">
                {!activeProjectId && <div className="p-4 bg-amber-50 text-amber-700 rounded-xl border border-amber-100 font-bold mb-4">يرجى اختيار مشروع من القائمة الرئيسية أولاً قبل الرفع.</div>}
                
                <div className="bg-neutral-50 p-8 rounded-[32px] border border-neutral-100">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="bg-emerald-100 p-3 rounded-2xl text-emerald-600">
                      <FileJson size={24} />
                    </div>
                    <div>
                      <h4 className="font-bold">استيراد مخزون الوحدات من Excel</h4>
                      <p className="text-xs text-neutral-400">استيراد الوحدات من ملف .xlsx أو .csv للمشروع الحالي</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => excelInputRef.current?.click()}
                    disabled={loading || !activeProjectId}
                    className="w-full py-10 border-2 border-dashed border-neutral-200 rounded-2xl flex flex-col items-center justify-center gap-3 hover:border-black transition-all group disabled:opacity-50"
                  >
                    <Upload size={32} className="text-neutral-300 group-hover:text-black transition-colors" />
                    <span className="text-sm font-bold text-neutral-500 group-hover:text-black">اضغط لرفع ملف Excel</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-10">
                <form onSubmit={handleSubmitUnit} className="bg-neutral-50 p-8 rounded-[32px] border border-neutral-100 space-y-6">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-bold text-lg">{editingUnitId ? 'تعديل وحدة' : 'إضافة وحدة جديدة'}</h4>
                    {editingUnitId && (
                      <button 
                        type="button" 
                        onClick={() => {
                          setEditingUnitId(null);
                          setUnitFormData({
                            name: '', price: 0, status: 'available', area: 0, bedrooms: 1, bathrooms: 1, floor: 1,
                            description: '', modelUrl: '', floorPlanUrl: '', vrTourUrl: '', interestLink: ''
                          });
                        }}
                        className="text-xs font-bold text-neutral-400 hover:text-black"
                      >
                        إلغاء التعديل
                      </button>
                    )}
                  </div>
                  
                  {!activeProjectId && <div className="p-4 bg-amber-50 text-amber-700 rounded-xl border border-amber-100 font-bold">يرجى اختيار مشروع من القائمة الرئيسية أولاً.</div>}
                  
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase text-neutral-400">اسم الوحدة / المعرف</label>
                      <input required className="w-full p-4 rounded-2xl border border-neutral-200" value={unitFormData.name} onChange={e => setUnitFormData({...unitFormData, name: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase text-neutral-400">السعر (ر.س)</label>
                      <input required type="number" className="w-full p-4 rounded-2xl border border-neutral-200" value={unitFormData.price} onChange={e => setUnitFormData({...unitFormData, price: Number(e.target.value)})} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase text-neutral-400">المساحة (م²)</label>
                      <input required type="number" className="w-full p-4 rounded-2xl border border-neutral-200" value={unitFormData.area} onChange={e => setUnitFormData({...unitFormData, area: Number(e.target.value)})} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase text-neutral-400">الحالة</label>
                      <select className="w-full p-4 rounded-2xl border border-neutral-200 bg-white" value={unitFormData.status} onChange={e => setUnitFormData({...unitFormData, status: e.target.value as any})}>
                        <option value="available">متاح</option>
                        <option value="reserved">محجوز</option>
                        <option value="sold">مباع</option>
                      </select>
                    </div>
                  </div>
                  <button disabled={loading || !activeProjectId} className="w-full bg-black text-white p-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-neutral-800 transition-all disabled:opacity-50">
                    {editingUnitId ? <Save size={20} /> : <Plus size={20} />}
                    {editingUnitId ? 'حفظ التغييرات' : 'إضافة الوحدة'}
                  </button>
                </form>

                <div className="space-y-4">
                  <h4 className="font-bold text-lg">الوحدات الحالية ({units.length})</h4>
                  <div className="grid grid-cols-1 gap-3">
                    {units.map(u => (
                      <div key={u.id} className="bg-white p-4 rounded-2xl border border-neutral-200 flex justify-between items-center group hover:border-black transition-all">
                        <div className="flex items-center gap-4">
                          <div className={`w-3 h-3 rounded-full ${
                            u.status === 'available' ? 'bg-emerald-500' : 
                            u.status === 'reserved' ? 'bg-amber-500' : 'bg-red-500'
                          }`} />
                          <div>
                            <h5 className="font-bold">{u.name || u.id}</h5>
                            <p className="text-[10px] text-neutral-400 uppercase tracking-widest">
                              {u.price.toLocaleString()} ر.س &bull; {u.area} م² &bull; الدور {u.floor}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                          <button onClick={() => handleEditUnit(u)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg">
                            <Settings size={18} />
                          </button>
                          <button onClick={() => handleDeleteUnit(u.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    ))}
                    {units.length === 0 && <p className="text-center py-10 text-neutral-400 italic">لا توجد وحدات مضافة لهذا المشروع.</p>}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
