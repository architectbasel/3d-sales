import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
  en: {
    translation: {
      "app_title": "Immo3D",
      "advanced_real_estate": "Advanced Real Estate Intelligence",
      "investor_login": "Investor Login",
      "sync_data": "Sync Data",
      "syncing": "Syncing...",
      "settings": "Settings",
      "units_list": "Units List",
      "units_count": "{{count}} Units",
      "no_units": "No units available at the moment.",
      "sync_with_csv": "Sync with CSV",
      "ai_analysis": "AI Investment Analysis",
      "real_time_intelligence": "Real-time market intelligence",
      "analyzing": "Analyzing data...",
      "floor": "Floor",
      "price": "Price",
      "area": "Area",
      "view_floor_plan": "View Floor Plan",
      "start_vr_tour": "Start VR Tour",
      "register_interest": "Register Interest",
      "available": "Available",
      "reserved": "Reserved",
      "sold": "Sold",
      "details": "Details",
      "dining_room": "Dining Room",
      "kitchen": "Kitchen",
      "majlis": "Majlis",
      "living_room": "Living Room",
      "bathrooms": "Bathrooms",
      "bedrooms": "Bedrooms",
      "maid_room": "Maid's Room",
      "swimming_pool": "Swimming Pool",
      "dark_mode": "Dark Mode",
      "light_mode": "Light Mode",
      "language": "Language",
      "admin_panel": "Admin Panel",
      "projects": "Projects",
      "clients": "Clients",
      "add_project": "Add Project",
      "add_client": "Add Client",
      "save": "Save",
      "cancel": "Cancel",
      "share": "Share",
      "share_project": "Share Project",
      "share_description": "Share this project with your clients",
      "project_link": "Project Link",
      "embed_code": "Embed Code",
      "copy_embed_hint": "Copy this code to add the project directly to your website.",
      "dev_url_warning": "Note: You are currently using a development link. For embedding to work on external sites, please use the 'Shared' link from the AI Studio share menu."
    }
  },
  ar: {
    translation: {
      "app_title": "إيمو 3D",
      "advanced_real_estate": "ذكاء العقارات المتطور",
      "investor_login": "دخول المستثمر",
      "sync_data": "مزامنة البيانات",
      "syncing": "جاري المزامنة...",
      "settings": "الإعدادات",
      "units_list": "قائمة الوحدات",
      "units_count": "{{count}} وحدة",
      "no_units": "لا توجد وحدات متوفرة حالياً.",
      "sync_with_csv": "مزامنة مع CSV",
      "ai_analysis": "تحليل الاستثمار بالذكاء الاصطناعي",
      "real_time_intelligence": "ذكاء السوق في الوقت الفعلي",
      "analyzing": "جاري تحليل البيانات...",
      "floor": "الطابق",
      "price": "السعر",
      "area": "المساحة",
      "view_floor_plan": "عرض مخطط الطابق",
      "start_vr_tour": "بدء جولة افتراضية",
      "register_interest": "تسجيل الاهتمام",
      "available": "متاح",
      "reserved": "محجوز",
      "sold": "مباع",
      "details": "التفاصيل",
      "dining_room": "غرفة طعام",
      "kitchen": "مطبخ",
      "majlis": "مجلس",
      "living_room": "غرفة معيشة",
      "bathrooms": "دورة مياه",
      "bedrooms": "غرفة نوم",
      "maid_room": "غرفة خادمة",
      "swimming_pool": "مسبح",
      "dark_mode": "الوضع الداكن",
      "light_mode": "الوضع الفاتح",
      "language": "اللغة",
      "admin_panel": "لوحة الإدارة",
      "projects": "المشاريع",
      "clients": "العملاء",
      "add_project": "إضافة مشروع",
      "add_client": "إضافة عميل",
      "save": "حفظ",
      "cancel": "إلغاء",
      "share": "مشاركة",
      "share_project": "مشاركة المشروع",
      "share_description": "شارك هذا المشروع مع عملائك",
      "project_link": "رابط المشروع",
      "embed_code": "كود التضمين (Embed Code)",
      "copy_embed_hint": "انسخ هذا الكود لإضافة المشروع مباشرة إلى موقعك الإلكتروني.",
      "dev_url_warning": "ملاحظة: أنت تستخدم حالياً رابط التطوير. لكي يعمل التضمين في المواقع الخارجية، يرجى استخدام الرابط 'المشارك' (Shared) من قائمة المشاركة في AI Studio."
    }
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'ar',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
