# LOGIKA BIZNESOWA, WORKFLOWS AI I ARCHITEKTURA UPRAWNIEŃ (RBAC)

Dokument określa logikę operacyjną systemu, szczegółowe scenariusze potoków pracy (Workflows), narzędzia dla każdej z ról oraz automatyzacje oparte o ekosystem Google (Workspace, Vertex AI, Drive, Calendar, Firebase).

---

## 1. POZIOM: ADMINISTRATOR SZKOŁY (SUPER-ADMIN / OWNER)

Administrator odpowiada za strategiczne zarządzanie placówką, automatyzację procesów finansowych, nadzór nad infrastrukturą RODO oraz inicjowanie zaawansowanych potoków pracy (Workflows) związanych z wydarzeniami.

### A. Główny Workflow Operacyjny:
1. **Zarządzanie Sezonem i Finansami:** Definiowanie struktury cenników i subskrypcji. System automatycznie pobiera opłaty przez webhooki Stripe/Przelewy24 z obsługą Apple Pay w przeglądarce Safari (omijając prowizje App Store).
2. **Projektowanie Siatki Zajęć:** Tworzenie cyklicznych planów lekcji za pomocą kalendarza typu drag-and-drop.
3. **Zarządzanie Zgodami RODO:** Monitorowanie integralności rejestru zgód (Consent Logs) oraz wywoływanie procedur retencji lub usuwania danych (Prawo do zapomnienia).

### B. Moduł Automatyzacji Wydarzeń (Event Orchestrator AI)
Moduł umożliwia administratorowi utworzenie dedykowanego wydarzenia (np. obóz taneczny, warsztaty, zawody wewnętrzne) za pomocą jednego zapytania do Asystenta AI. Inicjuje to następujący potok działań w ekosystemie Google:

*   **Inicjalizacja Przestrzeni (Google Drive API):** System automatycznie tworzy folder na Wspólnym Dysku Google: `Wydarzenia/[ROK]_[Nazwa_Wydarzenia]`. Generowany jest tam zabezpieczony arkusz *Google Sheets* ("Lista_Uczestników") zintegrowany z bazą SQL przez dwukierunkowy sync.
*   **Generowanie Materiałów Graficznych (Vertex AI Imagen Model):** Agent AI na podstawie opisu wydarzenia wywołuje model generatywny (np. Imagen 3), łącząc opis z wektorowym logo szkoły. Wynikowy plakat `.png` trafia do folderu na Dysku oraz na tablicę ogłoszeń w aplikacji rodziców.
*   **Harmonogramowanie (Google Calendar API):** Wydarzenie zostaje automatycznie dodane do kalendarzy Google przypisanych instruktorów oraz osadzone w strumieniu iCal/Google Calendar grup docelowych.
*   **Zarządzanie Listą Zamkniętą:** Zapisy rodziców automatycznie dopisują rekord do arkusza Google Sheets i generują fakturę/płatność jednorazową w module Stripe.

### C. Narzędzia Asystenta AI Administratora:
*   **Orkiestrator Zapytań:** Przetwarzanie poleceń tekstowych typu: *"Stwórz zawody 'Winter Dance Cup 2026' na dzień 15 grudnia dla grup zaawansowanych, przypisz Jana jako sędziego, wygeneruj plakat z naszym logo i przygotuj arkusz zapisu"*.
*   **Optymalizator Grafików:** Automatyczne generowanie i korekta siatek zajęć na podstawie dostępności sal i preferencji instruktorów.

### D. Ograniczenia Dostępów (Zabezpieczenia):
*   Pełny dostęp (Read/Write/Delete) do danych osobowych (PII), finansowych i logów systemowych.
*   Autoryzacja wyłącznie przez Google Identity Platform z bezwzględnym obowiązkiem uwierzytelniania dwuskładnikowego (2FA).

---

## 2. POZIOM: NAUCZYCIEL / INSTRUKTOR

Nauczyciel realizuje zadania dydaktyczne, kontroluje frekwencję, komunikuje się z przypisanymi grupami oraz dostarcza bezpieczny wsad multimedialny do analizy i dystrybucji.

### A. Główny Workflow Operacyjny:
1. **Rejestracja Obecności i Skanowanie Check-in:** Po wejściu na salę nauczyciel otwiera listę grupy. Oznacza obecność manualnie lub wywołuje natywną kamerę w aplikacji, aby szybko zeskanować cyfrowe karty `.pkpass` z Apple Wallet (lub Google Wallet) przyniesione przez uczniów. System natychmiast waliduje w bazie SQL ważność karnetu dziecka.
2. **Dystrybucja i Przetwarzanie Choreografii:** Po zakończeniu lekcji instruktor nagrywa smartfonem fragment układu i przesyła go bezpośrednio z aplikacji. 
    *   *Automatyzacja w tle:* Pliki `.mov` / HEVC (w tym Variable Frame Rate - VFR) z urządzeń Apple trafiają do kolejki Cloud Pub/Sub, gdzie kontener FFmpeg na Cloud Run konwertuje je do formatu `.mp4` o stałym klatkarzu (CFR). Następnie plik jest zapisywany w folderze grupy na Dysku Google i udostępniany rodzicom jako strumień wideo.

### B. Narzędzia i Potoki Asystenta AI Nauczyciela:
*   **Generator Dydaktyczny (Prompting Helper):** Dedykowany interfejs, w którym nauczyciel może generować konspekty lekcji. 
    *   *Przykład użycia:* Instruktor wybiera grupę i klika "Generuj rozgrzewkę". AI (Gemini 1.5) analizuje wiek grupy (np. 7-9 lat) i styl (np. Jazz) i zwraca: *"Zaproponuj 3 zabawy rytmiczne oparte na izolacji ciała, dostosowane do dzieci, trwające dokładnie 10 minut"*.
*   **Kreator Informacji Zwrotnej (Feedback Generator):** Narzędzie do półautomatycznej komunikacji z rodzicami. Nauczyciel wpisuje hasłowo: *"Kasia super postęp w piruetach, rączki do poprawy"*. Asystent AI formatuje to w profesjonalny, motywujący komunikat i wysyła jako powiadomienie push przez Firebase Cloud Messaging (FCM/APNs) do rodzica.

### C. Ograniczenia Dostępów (Zabezpieczenia):
*   **Ścisła Izolacja Finansowa:** Całkowity brak wglądu w moduły księgowe, stawki innych instruktorów oraz historię wpłat rodziców. System wyświetla wyłącznie binarny status dostępu ucznia ("Karnet aktywny" / "Brak opłaty - skieruj do recepcji").
*   **Ograniczenie PII (Zasada Minimalizmu RODO):** Nauczyciel widzi tylko imię i nazwisko dziecka, wiek, grupę oraz imię rodzica. Dane takie jak numery telefonów, adresy e-mail czy adresy zamieszkania są ukryte przed tą rolą.
*   **Izolacja Dokumentacji Workspace:** Nauczyciel ma dostęp *wyłącznie do odczytu* (Read-only) arkuszy Google Sheets powiązanych z wydarzeniami, w których bierze udział. Nie ma dostępu do folderu głównego `Wydarzenia/` ani struktur finansowych na Dysku Google.

---

## 3. POZIOM: UCZEŃ LUB RODZIC UCZNIA (KONTO PARENT-CHILD)

Poziom dedykowany dla rodziców (zarządzanie profilami dzieci, finanse, zgody prawne) oraz nieletnich uczniów (dostęp podglądowy do materiałów edukacyjnych).

### A. Główny Workflow Operacyjny:
1. **Onboarding, Rejestracja i RODO:** Rodzic zakłada konto nadrzędne (np. przez *Sign in with Apple* z obsługą maskowania *Hide My Email*). Następnie tworzy subprofile dla swoich dzieci (imię, rok urodzenia). Na tym etapie rodzic musi przejść przez panel granularnych zgód marketingowych, medycznych i wizerunkowych. Każde kliknięcie generuje nienaruszalny log (SHA-256) w bazie SQL dla UODO.
2. **Konsumpcja Wydarzeń i Zapisy:** Rodzic widzi wygenerowane przez AI banery zawodów/warsztatów na tablicy ogłoszeń. Kliknięcie "Zapisz dziecko" automatycznie:
    *   Dopisuje UUID dziecka do powiązanego arkusza Google Sheets w chmurze administracji.
    *   Inicjuje bezpieczną płatność Stripe/Apple Pay.
    *   Dopisuje wydarzenie do systemowego kalendarza w iPhonie/Androidzie rodzica za pomocą linku iCal.
3. **Pobieranie Karty Wstępu:** Jednoklikowe wygenerowanie pliku `.pkpass` i dodanie go do natywnego Apple Wallet/Google Wallet na smartfonie.

### B. Narzędzia Chatu AI (RAG oparty o Gemini 1.5 Flash i pgvector):
*   **Inteligentny Asystent Rodzica:** Całodobowy chatbot osadzony w aplikacji mobilnej.
    *   *Mechanizm działania:* Rodzic pyta na czacie: *"Amelia skręciła kostkę, jaki jest termin na rezygnację z obozu zimowego bez utraty zaliczki?"*. 
    *   *Potok danych:* Zapytanie jest wektoryzowane przez Vertex AI, system przeszukuje bazę `pgvector` w Cloud SQL zawierającą dokumenty regulaminów z Dysku Google szkoły, wyciąga właściwy paragraf i przekazuje do Gemini.
    *   *Odpowiedź:* Chatbot odpowiada językiem naturalnym: *"Zgodnie z §7 Regulaminu Obozów, bezkosztowa rezygnacja jest możliwa do 30 dni przed wyjazdem. Dla obozu zimowego ten termin mija 12 listopada. Po tym terminie wymagane jest zaświadczenie lekarskie. Czy chcesz pobrać formularz zwrotu?"* wraz z linkiem do dokumentu źródłowego.

### C. Ograniczenia Dostępów (Zabezpieczenia):
*   **Absolutna Izolacja Danych (Multi-tenancy):** Całkowity brak dostępu do danych jakichkolwiek innych użytkowników, rodziców czy dzieci. Wszelkie zapytania SQL oraz wektorowe są natychmiast filtrowane po `parent_uuid`.
*   **Blokada Eksfiltracji i Pobierania Mediów:** Filmy z choreografiami (na których mogą znajdować się inne dzieci z grupy) są renderowane przez bezpieczny odtwarzacz w aplikacji (Secure Stream). Pobieranie surowych plików z Dysku Google na pamięć telefonu jest zablokowane na poziomie uprawnień API, aby zapobiec nielegalnemu rozpowszechnianiu wizerunku nieletnich.
*   **Sandboxing Promptu AI:** Chatbot RAG ma uprawnienia wyłącznie do odczytu (Read-only) wektorów z bazy wiedzy oznaczonej jako publiczna (FAQ, regulaminy). Nie ma dostępu do promptów systemowych innych ról ani struktur bazodanowych zawierających dane finansowe szkoły.

---

## 4. ZAKTUALIZOWANA MACIERZ UPRAWNIEŃ DO ZASOBÓW GOOGLE WORKSPACE & CLOUD

| Zasób / Usługa Google | Administrator | Nauczyciel | Rodzic / Uczeń |
| :--- | :---: | :---: | :---: |
| **Dysk Google (Foldery Główne i Finanse)** | Pełny (RWX) | Brak | Brak |
| **Dysk Google (Folder Wydarzenia)** | Pełny (RWX) | Odczyt (R) | Brak (Tylko widok w App) |
| **Google Sheets (Lista Uczestników)** | Pełny (RWX) | Odczyt (R) | Brak (Zapis wyłącznie przez API) |
| **Google Calendar API (Modyfikacja)** | Pełny (RWX) | Brak | Brak |
| **Vertex AI Imagen (Generowanie)** | Dostępny | Brak | Brak |
| **Vertex AI + pgvector (Chatbot RAG)** | Zarządzanie bazą | Odczyt (R) | Odczyt (R - zawężony do FAQ) |
| **Firebase Cloud Messaging (FCM)** | Nadawanie masowe | Nadawanie grupowe | Tylko odbiór (Odbiorca) |