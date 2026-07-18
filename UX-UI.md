# SPECYFIKACJA UX/UI: STRUKTURA WIZUALNA I IDENTYFIKACJA WIZUALNA SYSTEMU

Dokument określa standardy wizualne, paletę kolorystyczną, typografię oraz architekturę ekranów (UX) zoptymalizowaną pod kątem elegancji, dynamiki tańca nowoczesnego oraz pełnej wieloplatformowości (Android, iOS, Desktop), bazując bezpośrednio na tożsamości pliku antidotum-male-logo-220x300 (1).png.

---

## 1. IDENTYFIKACJA WIZUALNA & ESTETYKA (ELEGANT & LIQUID DANCE STYLE)

Interfejs odrzuca surowy, hakerski dark-mode na rzecz zbalansowanego, luksusowego designu typu "Light/Premium-Dark Hybrid". Łączy on laboratoryjną czystość bieli z płynną energią różu i elegancją głębokiej czerni.

### A. Paleta Kolorystyczna (Wyciągnięta z antidotum-male-logo-220x300 (1).png)
*   **Kolor Główny Akcentu (Antidotum Pink):** Energetyczny, nasycony róż (`#F472B6` / `#FA8BFF`). Inspirowany płynem w kolbie i unoszącymi się bąbelkami. Używany do kluczowych elementów interaktywnych (CTA), statusów i wyróżnień AI.
*   **Tło Podstawowe (Dla Aplikacji Mobilnej):** Jasny, czysty minimalizm (`#F9FAFB`) przełamany kafelkami w kolorze czystej bieli (`#FFFFFF`). Zapewnia to lekkość, przejrzystość i doskonały kontrast.
*   **Tło Alternatywne (Dla Panelu Admina / Sekcji Wideo):** Głęboki, elegancki odcień węgla i matowej czerni (`#111827`). Nawiązuje do czarnych konturów kolby i sylwetki tancerki, tworząc kontrast "sceny tanecznej".
*   **Tekst i Linie Konturowe:** Głęboka czerń (`#000000` / `#1F2937`) – odwzorowująca charakterystyczny, czysty font napisu „antidotum”.

### B. Typografia & Czcionki
*   **Nagłówki (Headings):** *Comfortaa* lub *Bauhaus / ITC Avant Garde* – czcionki o obłych, geometrycznych kształtach, idealnie replikujące zaokrąglone, bezszeryfowe litery „a”, „n”, „d”, „o”, „t” z logo szkoły.
*   **Tekst Główny:** *Plus Jakarta Sans* lub *Inter* – nowoczesne, czytelne i lekkie, zapewniające płynność czytania na urządzeniach z systemem iOS (iPhone) oraz Android.

### C. Efekty Specjalne (Motion & Liquid UI)
*   **Bąbelkowe/Płynne Animacje (Liquid Motion):** Elementy ładowania (Loadery) oraz przejścia między ekranami wykorzystują fizykę płynów i unoszących się bąbelków (nawiązanie do kulek nad kolbą w logo).
*   **Round Geometry (Obłe Kształty):** Kafelki, przyciski i okienka modalne nie mają ostrych rogów – stosujemy duże zaokrąglenia krawędzi (`border-radius: 24px` lub `32px`), odzwierciedlając miękki, obły kształt laboratoryjnego naczynia.
*   **AI Pink Aura:** Funkcje napędzane przez sztuczną inteligencję posiadają subtelną, różowo-fioletową poświatę z efektem płynnego gradientu rozchodzącego się radialnie.

---

## 2. SYSTEM PŁATNOŚCI: POLSKI STANDARD (BLIK-FIRST)

Z uwagi na specyfikację polskiego rynku i maksymalną wygodę rodziców, głównym, promowanym kanałem płatności w aplikacji mobilnej jest **BLIK** oraz portfele mobilne, co pozwala ominąć prowizje sklepów z aplikacjami.

*   **Mobilny Flow (Android & iOS):** Aplikacja nie korzysta z systemowych płatności Google Play/Apple In-App Purchase. Po kliknięciu "Zapłać", system wywołuje bezpieczne, natywne okno przeglądarkowe (SFSafariViewController na iOS / Custom Tabs na Androidzie) zintegrowane ze Stripe/Przelewy24.
*   **UX Płatności:** Ekran natychmiast pozycjonuje pole na **6-cyfrowy kod BLIK** jako najszybszą metodę płatności, z alternatywną opcją wyboru **Apple Pay** (dla użytkowników iOS) oraz **Google Pay** (dla użytkowników Androida). Wszystkie te metody autoryzowane są biometrycznie (FaceID / TouchID / Odcisk palca na Androidzie).

---

## 3. ARCHITEKTURA EKRANÓW I STRUKTURA KAFELKÓW (UX)

### POZIOM 1: Administrator (Wersja Desktop Web)
Układ: Elegancki, biało-czarny interfejs o wysokim kontraście. Lewostronny, stały, wąski Sidebar + przestronny, modułowy dashboard.

#### Główny Pulpit (Dashboard):
*   **Kafelek: "Centrum Finansowe & Subskrypcje"**
    *   *Wizualia:* Minimalistyczny podgląd przychodów z różowym wskaźnikiem wzrostu procentowego.
    *   *Akcja po kliknięciu:* Otwiera pełnoekranowy panel finansowy: zestawienie faktur, lista zaległości, raporty rentowności grup połączone z Google Looker Studio.
*   **Kafelek: "Planowanie & Grafiki Zajęć"**
    *   *Wizualia:* Kalendarz w układzie siatki z płynnym zaznaczaniem bloków czasowych.
    *   *Akcja po kliknięciu:* Otwiera pełny kreator kalendarza z funkcją drag-and-drop (synchronizacja z Google Calendar API).
*   **Kafelek (Z efektem AI Pink Aura): "Orkiestrator Wydarzeń AI"**
    *   *Wizualia:* Kafelek z ikoną kolby laboratoryjnej uwalniającej różowe bąbelki, zawierający pole tekstowe na prompt.
    *   *Akcja po kliknięciu:* Otwiera okno modalne asystenta. Po wpisaniu komendy (np. *"Stwórz zawody..."*) uruchamia się animacja unoszących się pęcherzyków powietrza, a następnie wyświetla się split-screen: podgląd wygenerowanego folderu na Dysku Google, arkusza Google Sheets z listą uczestników oraz gotowego, eleganckiego baneru promocyjnego w formacie `.png` (z automatycznie wklejonym logo *Antidotum*).

---

### POZIOM 2: Nauczyciel / Instruktor (Pełna Symetria: Android & iOS)
Interfejs mobilny w jasnej, czystej stylistyce, gwarantujący czytelność w mocno oświetlonych salach tanecznych. Dolny pasek nawigacyjny: *Dziś*, *Grupy*, *AI Asystent*, *Konto*.

#### Ekran Główny ("Dziś"):
*   **Główny Przycisk Akcji: "Szybki Check-In (Skaner)"**
    *   *Wizualia:* Duży, okrągły przycisk w kolorze "Antidotum Pink" z ikoną sylwetki tancerki i skanera.
    *   *Akcja po kliknięciu:* Uruchamia natywny aparat (Cross-platform: Camera API na Androidzie / AVFoundation na iOS). Skanuje kod QR bezpośrednio z telefonu rodzica lub z cyfrowej karty dodanej do **Apple Wallet** (`.pkpass`) lub **Google Wallet**.
*   **Kafelki Sekwencyjne: "Moje Lekcje na Dziś"**
    *   *Wizualia:* Zaokrąglone białe kafelki ułożone chronologicznie na delikatnie szarym tle, z różowym paskiem postępu frekwencji (np. `18/22`).
    *   *Akcja po kliknięciu:* Otwiera listę obecności danej grupy. Znajduje się tu przycisk **"Nagraj / Dodaj wideo"**. Kliknięcie otwiera systemową kamerę. Po nagraniu wideo jest automatycznie wysyłane asynchronicznie do Cloud Run (potok FFmpeg), konwertowane z Apple `.mov` / Android `.mp4` (VFR) do uniwersalnego formatu stałoklatkowego (CFR) i publikowane dla rodziców.

#### Ekran "AI Asystent" (Z efektem AI Pink Aura):
*   **Kafelek: "Konstruktor Rozgrzewek"** $\rightarrow$ otwiera prompt helper połączony z Gemini 1.5, generujący konspekty na podstawie wieku i poziomu grupy.
*   **Kafelek: "Szybki Feedback"** $\rightarrow$ otwiera listę uczniów; instruktor dyktuje krótką notatkę, a AI formatuje ją w profesjonalną wiadomość push, wysyłaną przez FCM (Firebase Cloud Messaging) na telefony rodziców (zarówno Android, jak i iOS).

---

### POZIOM 3: Rodzic / Uczeń (Wersja Mobilna: Android & iOS)
Interfejs nastawiony na lekkość, elegancję i bezpieczeństwo. Białe tła z akcentami głębokiej czerni i różu. Dolny pasek nawigacyjny: *Pulpit*, *Kalendarz*, *Strefa Wideo*, *Pomoc AI*.

#### Ekran Główny (Pulpit):
*   **Górny Widget: "Karta Członkowska"**
    *   *Wizualia:* Cyfrowy karnet z unikalnym kodem QR, ozdobiony grafiką kolby z logo. Posiada dwa natywne przyciski w zależności od systemu: **"Dodaj do Apple Wallet"** (na iOS) lub **"Dodaj do Google Wallet"** (na Androidzie).
*   **Sekcja: "Tablica Ogłoszeń & Wydarzenia"**
    *   *Wizualia:* Płynna, horyzontalna karuzela (Swipe) prezentująca banery graficzne (generowane przez AI administracji w spójnej, różowo-biało-czarnej kolorystyce).
    *   *Akcja po kliknięciu:* Kliknięcie w baner (np. warsztaty z gwiazdą) otwiera okno modalne ze szczegółami wydarzenia i jednym, dużym przyciskiem: **"Zapisz dziecko i zapłać (BLIK / Portfel)"**. Kliknięcie wywołuje natychmiastowe okno płatności Przelewy24/Stripe.

#### Ekran "Strefa Wideo" (Edukacja):
*   **Kafelki Przypisanych Grup:** Segmentacja per dziecko (jeśli rodzic ma więcej niż jedno dziecko w szkole). Ten ekran przełącza się w "Premium Dark Mode", aby wideo miało kinowy charakter.
    *   *Akcja po kliknięciu:* Otwiera bezpieczny odtwarzacz wideo z płynnym strumieniowaniem (HLS/DASH) materiałów wgranych przez trenera. Interfejs uniemożliwia zapisanie pliku w pamięci urządzenia (ochrona wizerunku nieletnich).

#### Ekran "Pomoc AI" (Z efektem AI Pink Aura):
*   **Okno Chatu 24/7:**
    *   *Wizualia:* Czyste, jasne okno konwersacji z różowym kursorem. Na dole umieszczone są kafelki szybkiego wyboru (Quick Replies): *"Jak odrobić lekcję?"*, *"Terminy zawodów"*, *"Cennik i BLIK"*.
    *   *Akcja po kliknięciu:* Uruchamia natychmiastową interakcję z botem RAG (Gemini 1.5 Flash), który przeszukuje bazę wiedzy `pgvector` opartą na plikach Google Docs szkoły i odpowiada językiem naturalnym, podając linki referencyjne do dokumentów źródłowych na Dysku Google.