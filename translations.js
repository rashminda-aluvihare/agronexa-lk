// ── AGRONEXA LK MULTI-LINGUAL DICTIONARY ──
const TRANSLATIONS = {
  en: {
    // Nav & General
    "nav-dashboard": "Dashboard",
    "nav-marketplace": "Marketplace",
    "nav-requests": "My Requests",
    "nav-bookings": "My Bookings",
    "nav-ledger": "Ledger History",
    "nav-messages": "Messages",
    "nav-profile": "Profile",
    "nav-settings": "Settings",
    "nav-signout": "Sign out",
    "nav-transport": "Transport Logistics",
    "status-live": "Live",
    "status-offline": "Offline",
    "status-connecting": "Connecting...",
    "btn-save": "Save Changes",

    // Landing Page
    "landing-title": "Smart Farming Platform for Sri Lanka",
    "landing-sub": "Direct trading and transparent machinery rentals powered by cryptographic trust.",
    "landing-btn-login": "Sign in to AgroNexa",
    "landing-link-forgot": "Forgot Password?",
    "landing-link-register": "Don't have an account? Sign up",
    "landing-role-buyer": "B2B Corporate Buyer",
    "landing-role-farmer": "Local Farmer / Seller",

    // Dashboard Cards
    "card-active-requests": "Active Requests",
    "card-active-requests-sub": "Awaiting seller response",
    "card-unread-notif": "New Responses",
    "card-unread-notif-sub": "From sellers",
    "card-confirmed-bookings": "Confirmed Bookings",
    "card-confirmed-bookings-sub": "Active rentals",
    "card-total-bookings": "Total Bookings",
    "card-total-bookings-sub": "Lifetime history",

    // Seller Specific Cards
    "card-active-listings": "Active Listings",
    "card-active-listings-sub": "Active in marketplace",
    "card-pending-requests": "Incoming Buyer Requests",
    "card-pending-requests-sub": "Needs seller response",
    "card-monthly-earnings": "Monthly Earnings",
    "card-completed-rentals": "Completed Rentals",
    "card-completed-rentals-sub": "Successful rentals",

    // Weather Widget
    "weather-title": "🌦️ Weather Alert & Farming Advisory",
    "weather-temp": "Temperature",
    "weather-humidity": "Humidity",
    "weather-loading": "Loading local weather...",
    "weather-desc": "Weather advice for your district.",

    // Price Index
    "price-index-title": "📊 Daily Crop Market Price Index (Sri Lanka)",
    "price-index-sub": "Average market rates per kg from dedicated economic centres.",
    "price-crop": "Crop",
    "price-avg": "Avg Price",
    "price-change": "Change",

    // Transport Logistics
    "logistics-title": "🚛 Transport & Logistics Registry",
    "logistics-sub": "Find and book local lorry owners and transport providers in your district.",
    "logistics-tab-browse": "Browse Local Drivers",
    "logistics-tab-register": "Register Vehicle",
    "logistics-label-owner": "Owner Name",
    "logistics-label-type": "Vehicle Type",
    "logistics-label-no": "Plate Number",
    "logistics-label-capacity": "Capacity (kg)",
    "logistics-label-phone": "Contact Phone",
    "logistics-label-district": "Operating District",
    "logistics-btn-register": "Publish Transport Listing",
    "logistics-driver-call": "Call Driver",
    "logistics-no-drivers": "No transport providers registered in your district yet."
  },
  si: {
    // Nav & General
    "nav-dashboard": "ප්‍රධාන පුවරුව",
    "nav-marketplace": "අලෙවිසැල",
    "nav-requests": "මගේ ඉල්ලීම්",
    "nav-bookings": "මගේ වෙන්කිරීම්",
    "nav-ledger": "ලෙජර් ඉතිහාසය",
    "nav-messages": "පණිවිඩ",
    "nav-profile": "පරිශීලක ගිණුම",
    "nav-settings": "සැකසුම්",
    "nav-signout": "ගිණුමෙන් ඉවත් වන්න",
    "nav-transport": "ප්‍රවාහන සැපයුම්",
    "status-live": "සක්‍රියයි",
    "status-offline": "නොබැඳි",
    "status-connecting": "සම්බන්ධ වෙමින්...",
    "btn-save": "වෙනස්කම් සුරකින්න",

    // Landing Page
    "landing-title": "ශ්‍රී ලංකාවේ ස්මාර්ට් ගොවි තාක්ෂණික වේදිකාව",
    "landing-sub": "ක්‍රිප්ටොග්‍රැෆික් විශ්වාසය මත පදනම් වූ සෘජු වෙළඳාම සහ විනිවිදභාවයෙන් යුතු යන්ත්‍රෝපකරණ කුලියට දීම.",
    "landing-btn-login": "AgroNexa වෙත ඇතුල් වන්න",
    "landing-link-forgot": "මුරපදය අමතකද?",
    "landing-link-register": "ගිණුමක් නොමැතිද? ලියාපදිංචි වන්න",
    "landing-role-buyer": "B2B ආයතනික ගැනුම්කරු",
    "landing-role-farmer": "දේශීය ගොවි / විකුණුම්කරු",

    // Dashboard Cards
    "card-active-requests": "ක්‍රියාකාරී ඉල්ලීම්",
    "card-active-requests-sub": "විකුණුම්කරුගේ ප්‍රතිචාර අපේක්ෂාවෙන්",
    "card-unread-notif": "නව ප්‍රතිචාර",
    "card-unread-notif-sub": "විකුණුම්කරුවන්ගෙන් ලැබුණු",
    "card-confirmed-bookings": "තහවුරු කළ වෙන්කිරීම්",
    "card-confirmed-bookings-sub": "ක්‍රියාකාරී කුලී සේවා",
    "card-total-bookings": "මුළු වෙන්කිරීම්",
    "card-total-bookings-sub": "පද්ධතිය තුළ මුළු ඉතිහාසය",

    // Seller Specific Cards
    "card-active-listings": "ක්‍රියාකාරී දැන්වීම්",
    "card-active-listings-sub": "අලෙවිසැලේ සක්‍රීයව පවතින",
    "card-pending-requests": "ලැබුණු ගැනුම්කරුගේ ඉල්ලීම්",
    "card-pending-requests-sub": "විකුණුම්කරුගේ ප්‍රතිචාර අවශ්‍ය",
    "card-monthly-earnings": "මාසික ආදායම",
    "card-completed-rentals": "අවසන් කළ කුලී සේවා",
    "card-completed-rentals-sub": "සාර්ථකව අවසන් කළ කුලී සේවා",

    // Weather Widget
    "weather-title": "🌦️ කාලගුණ අනාවැකිය සහ ගොවි උපදේශනය",
    "weather-temp": "උෂ්ණත්වය",
    "weather-humidity": "ආර්ද්‍රතාවය",
    "weather-loading": "දේශීය කාලගුණය ගණනය වෙමින් පවතී...",
    "weather-desc": "ඔබේ දිස්ත්‍රික්කයට ගැලපෙන වගා උපදෙස්.",

    // Price Index
    "price-index-title": "📊 දෛනික බෝග වෙළඳපල මිල දර්ශකය (ශ්‍රී ලංකාව)",
    "price-index-sub": "විශේෂිත ආර්ථික මධ්‍යස්ථානවලින් ලබාගත් සාමාන්‍ය කිලෝග්‍රෑමයක මිල ගණන්.",
    "price-crop": "බෝගය",
    "price-avg": "සාමාන්‍ය මිල",
    "price-change": "මිල වෙනස",

    // Transport Logistics
    "logistics-title": "🚛 ප්‍රවාහන හා සැපයුම් ලේඛනය",
    "logistics-sub": "ඔබේ ප්‍රදේශයේ සිටින ලොරි රථ හිමියන් සහ ප්‍රවාහන සේවා සපයන්නන් සොයාගෙන වෙන්කරවා ගන්න.",
    "logistics-tab-browse": "දේශීය රියදුරන් සොයන්න",
    "logistics-tab-register": "රථය ලියාපදිංචි කරන්න",
    "logistics-label-owner": "හිමිකරුගේ නම",
    "logistics-label-type": "වාහන වර්ගය",
    "logistics-label-no": "ලියාපදිංචි අංකය",
    "logistics-label-capacity": "ධාරිතාව (කි.ග්‍රෑ)",
    "logistics-label-phone": "දුරකථන අංකය",
    "logistics-label-district": "ක්‍රියාත්මක වන දිස්ත්‍රික්කය",
    "logistics-btn-register": "ප්‍රවාහන දැන්වීම පළ කරන්න",
    "logistics-driver-call": "රියදුරු අමතන්න",
    "logistics-no-drivers": "ඔබේ දිස්ත්‍රික්කය සඳහා තවමත් ප්‍රවාහන සපයන්නන් ලියාපදිංචි වී නොමැත."
  },
  ta: {
    // Nav & General
    "nav-dashboard": "டாஷ்போர்டு",
    "nav-marketplace": "சந்தை",
    "nav-requests": "எனது கோரிக்கைகள்",
    "nav-bookings": "எனது முன்பதிவுகள்",
    "nav-ledger": "கணக்கு வரலாறு",
    "nav-messages": "செய்திகள்",
    "nav-profile": "சுயவிவரம்",
    "nav-settings": "அமைப்புகள்",
    "nav-signout": "வெளியேறு",
    "nav-transport": "போக்குவரத்து மற்றும் தளவாடங்கள்",
    "status-live": "செயலில் உள்ளது",
    "status-offline": "இணைப்பற்ற",
    "status-connecting": "இணைக்கிறது...",
    "btn-save": "மாற்றங்களைச் சேமிக்கவும்",

    // Landing Page
    "landing-title": "இலங்கைக்கான ஸ்மார்ட் விவசாய தொழில்நுட்ப தளம்",
    "landing-sub": "கிரிப்டோகிராஃபிக் நம்பிக்கையின் மூலம் நேரடி வர்த்தகம் மற்றும் வெளிப்படையான விவசாய இயந்திர வாடகை.",
    "landing-btn-login": "AgroNexa இல் உள்நுழைக",
    "landing-link-forgot": "கடவுச்சொல்லை மறந்துவிட்டீர்களா?",
    "landing-link-register": "கணக்கு இல்லையா? பதிவு செய்யவும்",
    "landing-role-buyer": "B2B கார்ப்பரேட் வாங்குபவர்",
    "landing-role-farmer": "உள்ளூர் விவசாயி / விற்பனையாளர்",

    // Dashboard Cards
    "card-active-requests": "செயலில் உள்ள கோரிக்கைகள்",
    "card-active-requests-sub": "விற்பனையாளர் பதிலுக்காக காத்திருக்கிறது",
    "card-unread-notif": "புதிய பதில்கள்",
    "card-unread-notif-sub": "விற்பனையாளர்களிடமிருந்து",
    "card-confirmed-bookings": "உறுதிப்படுத்தப்பட்ட முன்பதிவுகள்",
    "card-confirmed-bookings-sub": "செயலில் உள்ள வாடகைகள்",
    "card-total-bookings": "மொத்த முன்பதிவுகள்",
    "card-total-bookings-sub": "முழுமையான வரலாறு",

    // Seller Specific Cards
    "card-active-listings": "செயலில் உள்ள விளம்பரங்கள்",
    "card-active-listings-sub": "சந்தையில் செயலில் உள்ளது",
    "card-pending-requests": "வாங்குபவரின் கோரிக்கைகள்",
    "card-pending-requests-sub": "விற்பனையாளரின் பதில் தேவை",
    "card-monthly-earnings": "மாதாந்திர வருமானம்",
    "card-completed-rentals": "நிறைவடைந்த வாடகைகள்",
    "card-completed-rentals-sub": "வெற்றிகரமான வாடகைகள்",

    // Weather Widget
    "weather-title": "🌦️ வானிலை எச்சரிக்கை மற்றும் விவசாய ஆலோசனை",
    "weather-temp": "வெப்பநிலை",
    "weather-humidity": "ஈரப்பதம்",
    "weather-loading": "உள்ளூர் வானிலை ஏற்றப்படுகிறது...",
    "weather-desc": "உங்கள் மாவட்டத்திற்கான வானிலை ஆலோசனை.",

    // Price Index
    "price-index-title": "📊 தினசரி பயிர் சந்தை விலை குறியீடு (இலங்கை)",
    "price-index-sub": "பிரத்யேக பொருளாதார மையங்களின் சராசரி கிலோ விலை.",
    "price-crop": "பயிர்",
    "price-avg": "சராசரி விலை",
    "price-change": "விலை மாற்றம்",

    // Transport Logistics
    "logistics-title": "🚛 போக்குவரத்து மற்றும் தளவாடப் பதிவேடு",
    "logistics-sub": "உங்கள் மாவட்டத்தில் உள்ள உள்ளூர் லொறி உரிமையாளர்கள் மற்றும் போக்குவரத்து வழங்குநர்களை முன்பதிவு செய்யவும்.",
    "logistics-tab-browse": "உள்ளூர் ஓட்டுநர்களை உலாவுக",
    "logistics-tab-register": "வாகனத்தை பதிவு செய்",
    "logistics-label-owner": "உரிமையாளர் பெயர்",
    "logistics-label-type": "வாகன வகை",
    "logistics-label-no": "பதிவு எண்",
    "logistics-label-capacity": "கொள்ளளவு (கிலோ)",
    "logistics-label-phone": "தொலைபேசி எண்",
    "logistics-label-district": "இயங்கும் மாவட்டம்",
    "logistics-btn-register": "போக்குவரத்து விளம்பரத்தை வெளியிடவும்",
    "logistics-driver-call": "ஓட்டுநரை அழைக்கவும்",
    "logistics-no-drivers": "உங்கள் மாவட்டத்தில் இன்னும் போக்குவரத்து வழங்குநர்கள் யாரும் பதிவு செய்யப்படவில்லை."
  }
};

// Apply translations based on stored selection
function applyTranslations() {
  const currentLang = localStorage.getItem("agro_lang") || "en";
  const dictionary = TRANSLATIONS[currentLang];
  if (!dictionary) return;

  // Translate by data-i18n attribute
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n");
    if (dictionary[key]) {
      el.textContent = dictionary[key];
    }
  });

  // Translate by data-i18n-placeholder attribute
  document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
    const key = el.getAttribute("data-i18n-placeholder");
    if (dictionary[key]) {
      el.setAttribute("placeholder", dictionary[key]);
    }
  });

  // Update HTML lang attribute
  document.documentElement.setAttribute("lang", currentLang);
}

// Change page language
function changeLanguage(lang) {
  localStorage.setItem("agro_lang", lang);
  applyTranslations();
  
  // Update dropdown value to match if it exists
  const langSelect = document.getElementById("language-selector");
  if (langSelect) langSelect.value = lang;
}

// Inject selector into topbar programmatically if target container exists
function injectLanguageSelector() {
  const topbarRight = document.querySelector(".topbar-right");
  if (!topbarRight) return;
  
  // Prevent duplicate injection
  if (document.getElementById("language-selector")) return;

  const selector = document.createElement("select");
  selector.id = "language-selector";
  selector.className = "form-input";
  selector.style.width = "110px";
  selector.style.padding = "4px 8px";
  selector.style.marginRight = "10px";
  selector.style.fontSize = "12px";
  selector.style.height = "32px";
  selector.style.background = "var(--card)";
  selector.style.color = "var(--text)";
  selector.style.border = "1px solid var(--border)";
  selector.style.borderRadius = "8px";
  
  selector.innerHTML = `
    <option value="en">🇬🇧 English</option>
    <option value="si">🇱🇰 සිංහල</option>
    <option value="ta">🇱🇰 தமிழ்</option>
  `;
  
  // Set current selected value
  selector.value = localStorage.getItem("agro_lang") || "en";
  
  selector.addEventListener("change", function(e) {
    changeLanguage(e.target.value);
  });
  
  topbarRight.insertBefore(selector, topbarRight.firstChild);
}

// Initialize translations
document.addEventListener("DOMContentLoaded", () => {
  injectLanguageSelector();
  
  // Bind listener to manually defined selector if it exists
  const manualSelector = document.getElementById("language-selector");
  if (manualSelector) {
    manualSelector.value = localStorage.getItem("agro_lang") || "en";
    // Avoid duplicate event listener
    manualSelector.removeEventListener("change", handleLangChange);
    manualSelector.addEventListener("change", handleLangChange);
  }
  
  applyTranslations();
});

function handleLangChange(e) {
  changeLanguage(e.target.value);
}
