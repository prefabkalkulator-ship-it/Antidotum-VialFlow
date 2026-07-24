Integracja silnika syntezy ruchu EDGE w architekturze Progressive Web App dla interaktywnego systemu edukacji tanecznej
Wdrażanie zaawansowanych systemów syntezy ruchu opartych na modelach dyfuzyjnych, takich jak EDGE (Editable Diffusion for Music-Conditioned Dance Generation), wymaga precyzyjnie zaprojektowanej architektury systemowej. Głównym wyzwaniem inżynieryjnym w kontekście Progressive Web App (PWA) przeznaczonego dla szkół tańca jest asymetria wydajnościowa między urządzeniem klienckim (często smartfonem średniej klasy) a serwerem wykonującym kosztowną obliczeniowo inferencję sieci głębokich. Poniższy raport przedstawia pogłębioną analizę techniczną wdrożenia takiego systemu, uwzględniającą optymalizację przesyłu danych, akcelerację backendu, renderowanie 3D w przeglądarce oraz techniki offline-first.   

Architektura systemu i pipeline przetwarzania (Client-Server)
Podział zadań w architekturze klient-serwer
W celu zapewnienia responsywności i płynności działania aplikacji, system opiera się na ścisłym podziale odpowiedzialności. Lekki klient PWA uruchomiony w przeglądarce użytkownika odpowiada za warstwę prezentacji, obsługę lokalnych multimediów, zarządzanie stanem odtwarzacza, rejestrację audio oraz renderowanie 3D. Backend realizuje ciężkie zadania uczenia maszynowego: ekstrakcję głębokich reprezentacji muzycznych przy użyciu zamrożonego modelu Jukebox oraz syntezę ruchu przy użyciu transformera dyfuzyjnego EDGE.   

+-----------------------------------------------------------------------------------+
|                                 KLIENT (PWA)                                      |
|                                                                                   |
|  [ Plik Audio ] ---> (Lokalna Kompresja) ---> [ Przesłanie Audio przez HTTP/2 ]   |
|                                                                                   |
|                                                                                   v
+-----------------------------------------------------------------------------------+
|                                 BACKEND (GPU)                                     |
|                                                                                   |
|  [ Ekstrakcja Cech: Jukebox (Layer 36) ] ---> [ Inferencja Modelu EDGE (DDIM) ]   |
|                                                                                   |
|                                                                                   v
+-----------------------------------------------------------------------------------+
|                                 KLIENT (PWA)                                      |
|                                                                                   |
|  [ Renderowanie 3D: Three.js ] <--- (Dekodowanie Binarne) <--- [ Odbiór Ruchu ]   |
+-----------------------------------------------------------------------------------+
Proces przetwarzania danych przebiega według ściśle określonej sekwencji etapów, optymalizujących czas odpowiedzi systemu:

Etap	Komponent wykonawczy	Przetwarzane dane i formaty	Wykorzystywane technologie
1. Pozyskanie Audio	PWA (Przeglądarka)	
Rejestracja mikrofonem lub wybór pliku MP3/WAV.

Web Audio API, MediaRecorder.
2. Wstępna Kompresja	PWA (Przeglądarka)	Konwersja do formatu Opus (kontener OGG) przy bitrate 64 kbps.	WebAssembly (FFmpeg.wasm).
3. Transfer Uplink	Sieć bezprzewodowa	Przesłanie skompresowanego pliku audio do backendu.	HTTP/2 POST / WebSockets.
4. Ekstrakcja Cech	Backend (GPU)	
Konwersja audio do reprezentacji Jukebox (środkowa warstwa 36).

PyTorch, jukemirlib.

5. Generowanie Ruchu	Backend (GPU)	
Dyfuzyjna generacja klatek ruchu SMPL na bazie cech audio.

EDGE (Transformer), CUDA, DDIM.

6. Transfer Downlink	Sieć bezprzewodowa	Przesłanie wygenerowanej sekwencji ruchu do klienta.	Skompresowany bufor binarny (ArrayBuffer).
7. Ortonormalizacja	PWA (Przeglądarka)	
Rekonstrukcja macierzy rotacji z formatu 6-DOF do kwaternionów.

JavaScript / WebAssembly.
8. Wizualizacja 3D	PWA (Przeglądarka)	
Aktualizacja szkieletu awatara i synchronizacja z dźwiękiem.

Three.js, WebGL2.

  
Optymalizacja transferu danych i reprezentacja ruchu
Tradycyjne formaty wymiany danych 3D, takie jak surowy JSON czy kompletne pliki FBX/gLTF, wprowadzają ogromny narzut podczas transmisji sieciowej i parsowania na urządzeniach mobilnych. Model EDGE generuje sekwencje ruchu w formacie SMPL (24 stawy szkieletu). Reprezentacja pojedynczej klatki ruchu x ma postać wektora o wymiarowości:   

x={b,w}∈R 
151
 
Na ten wektor składają się następujące elementy:   

w∈R 
147
  – reprezentujący 24 stawy w formacie SMPL przy użyciu ciągłej rotacji 6-DOF (24×6=144 wartości zmiennoprzecinkowych) oraz pojedynczą trójwymiarową translację korzenia (root translation, 3 wartości zmiennoprzecinkowe).   

b∈{0,1} 
4
  – binarna etykieta kontaktu stóp z podłożem (heel i toe dla obu stóp), służąca do eliminacji zjawiska ślizgania się stóp (foot-sliding) za pomocą Contact Consistency Loss.   

Dla standardowej animacji trwającej 30 sekund, generowanej przy częstotliwości 60 klatek na sekundę (FPS), całkowita objętość surowych danych numerycznych wynosi:   

Rozmiar=30 s×60 kl/s×151 warto 
s
ˊ
 ci×4 bajty (Float32)=1087200 bajt 
o
ˊ
 w≈1.04 MB
Porównanie wydajności różnych formatów przesyłu tych danych z serwera do aplikacji PWA przedstawia poniższa tabela:

Format danych	Średni rozmiar (30s @ 60 FPS)	Czas parsowania (Mobile CPU)	Zgodność z WebGL / Three.js	Możliwość strumieniowania
Tekstowy JSON	~3.8 MB – 5.2 MB	Wysoki (parowanie ciągów znaków, alokacja pamięci)	Średnia (wymaga mapowania na obiekty JS)	Średnia (wymaga buforowania całości)
Binary ArrayBuffer	~1.04 MB (surowe Float32)	Praktycznie zerowy (bezpośredni odczyt z pamięci)	Wysoka (bezpośrednie zasilenie TypedArrays)	Wysoka (odczyt liniowy strumienia)
glTF 2.0 (Embedded)	~5.5 MB (Base64 JSON)	Bardzo wysoki (dekodowanie Base64 + parsowanie)	
Wysoka (poprzez standardowy GLTFLoader)

Niska (całość musi być zdekodowana)
Skompresowany GLB	
~350 KB (Draco / Meshopt)

Niski do średniego (zależny od dekodera WASM)

Wysoka (wymaga wtyczki DRACOLoader)

Średnia (dekompresja blokowa)
  
Rekomenduje się zastosowanie dedykowanego formatu binarnego (Custom Binary ArrayBuffer). Zamiast pakowania danych w strukturę gLTF na serwerze, backend zwraca surowy strumień bajtów reprezentujących liczby zmiennoprzecinkowe pojedynczej precyzji (Float32), poprzedzony krótkim nagłówkiem (metadane: czas trwania, liczba klatek, FPS, identyfikator audio). PWA interpretuje ten strumień za pomocą obiektu Float32Array bezpośrednio z bufora sieciowego fetch bez narzutu na parsowanie. Dynamiczne mapowanie rotacji stawów na klatki animacji szkieletowej odbywa się bezpośrednio w pamięci przeglądarki, gdzie jako szkielet bazowy wykorzystywany jest lekki, lokalnie buforowany model awatara w formacie GLB zoptymalizowany kompresją Draco.   

Wydajność backendu i optymalizacje modelu EDGE
Wymagania sprzętowe i charakterystyka inferencji
Model EDGE w swojej oryginalnej konfiguracji naukowej wykazuje bardzo wysokie wymagania sprzętowe, uniemożliwiające bezpośrednie wdrożenie produkcyjne bez modyfikacji. Środowisko testowe oparte na pojedynczym GPU NVIDIA T4 (16 GB VRAM) pozwala na uruchomienie modelu, ale czas inferencji dla dłuższych sekwencji jest daleki od czasu rzeczywistego ze względu na dwa główne wąskie gardła obliczeniowe:   

Ekstrakcja cech audio (Jukebox): Model Jukebox wymaga co najmniej 12 GB dedykowanej pamięci VRAM na karcie graficznej oraz minimum 30 GB systemowej pamięci RAM. Generowanie reprezentacji dla minuty dźwięku na standardowej karcie Nvidia T4 zajmuje około kilkudziesięciu sekund.   

Generowanie ruchu (Diffusion Transformer): Klasyczne próbkowanie za pomocą stochastycznego procesu noisingu/denoisingu (DDPM) zakłada przejście przez T = 1000 kroków dyfuzji, co przy architekturze transformera generuje opóźnienia rzędu 15–30 sekund dla 10-sekundowego klipu.   

Aby osiągnąć czas inferencji poniżej 5 sekund (akceptowalny dla dynamicznego systemu treningowego), konieczne jest drastyczne zredukowanie liczby kroków dyfuzyjnych oraz optymalizacja modułu ekstrakcji cech audio.

Techniki akceleracji i optymalizacji modeli
Przeniesienie modeli z fazy badawczej do stabilnego środowiska chmurowego (np. Google Cloud Platform / Vertex AI) wymaga zastosowania zintegrowanego łańcucha optymalizacji. Poniższa tabela przedstawia systematykę i potencjał wdrożeniowy poszczególnych technik akceleracji:

Metoda optymalizacji	Zastosowanie w modelu	Mechanizm działania	Skutek wydajnościowy
Próbkowanie DDIM / DPM-Solver

[cite: 10, 24]

Proces odszumiania (EDGE Transformer)	
Redukcja liczby kroków z 1000 do 20-50 kroków deterministycznych.

20x – 50x przyspieszenie generowania ruchu (czas syntezy ruchu ~4.57s).

Kompilacja Graph-level	Cały potok (PyTorch)	Wykorzystanie TensorRT lub torch.compile do fuzji operacji matematycznych (fuzja kerneli CUDA).	1.5x – 2.5x szybszy czas przejścia sieci (forward pass).
Kwantyzacja wag (FP16/FP8)

[cite: 1, 28]

EDGE & Jukebox	
Zredukowanie precyzji zapisu wag z FP32 do FP16 lub FP8 dla warstw transformera.

2x mniejsze zużycie VRAM, optymalizacja transferu wewnątrz GPU.

Lekkie Alternatywy Audio

[cite: 27]

Ekstraktor cech muzycznych	
Zastąpienie Jukeboxa modelem MERT, Wav2Vec2 lub biblioteką Librosa (35-wymiarowe wektory MFCC/Chroma).

Eliminacja wąskiego gardła VRAM; ekstrakcja cech w < 100 ms.

Cykliczne buforowanie cech

[cite: 1]

Zarządzanie zasobami (Backend)	
Przechowywanie raz wyekstrahowanych reprezentacji muzycznych dla stałego zestawu utworów w bazie Redis.

Wyeliminowanie narzutu Jukeboxa dla powtarzających się zapytań (0 ms opóźnienia ekstrakcji).

Triton Inference Server

[cite: 29]

Orkiestracja (GCP / Vertex AI)	
Wykonywanie modeli jako potok "Ensemble Model" z dynamicznym batchowaniem.

Zmniejszenie narzutu na przesyłanie tensorów między procesami w pamięci GPU.

  
Wdrożenie deterministycznego algorytmu próbkowania DDIM (Denoising Diffusion Implicit Models) lub DPM-Solver pozwala zredukować liczbę kroków odszumiania do zaledwie 20–50. Zamiast stochastycznego błądzenia, algorytm rozwiązuje deterministyczne równanie różniczkowe zwyczajne (ODE) łączące rozkład szumu z rozkładem danych rzeczywistych. Skraca to czas generacji sekwencji ruchu na karcie klasy Nvidia T4 do poniżej 2 sekund, co w pełni odpowiada kryteriom aplikacji interaktywnej.   

Renderowanie 3D i interaktywność w PWA (Frontend)
Wybór silnika graficznego i mapowanie szkieletu
WebGL jest technologią niskopoziomową, co wymusza zastosowanie wysokopoziomowej biblioteki ułatwiającej zarządzanie sceną 3D. Porównanie dwóch wiodących rozwiązań w ekosystemie JavaScript wskazuje na wyraźne różnice architektoniczne:   

Three.js: Charakteryzuje się relatywnie małym rozmiarem biblioteki bazowej, wysoką modularnością, doskonałym wsparciem dla standardu WebGL2 oraz zoptymalizowanymi strukturami danych do obsługi animacji szkieletowej (SkinnedMesh i Skeleton). Jest to rozwiązanie rekomendowane do renderowania pojedynczego awatara z płynnością 60 FPS na urządzeniach mobilnych.   

Babylon.js: Oferuje bogatszy zestaw narzędzi "out-of-the-box" (wbudowane systemy kolizji, zaawansowane postprocesy), jednak generuje znacznie większy narzut na pamięć operacyjną (RAM/VRAM) oraz dłuższy czas inicjalizacji silnika, co negatywnie wpływa na czas uruchamiania PWA.

Głównym zadaniem frontendu jest zmapowanie wyjściowych rotacji z modelu EDGE do struktury kości importowanego modelu 3D (np. postaci w formacie GLTF/GLB). Model EDGE zwraca rotacje w formacie 6-DOF, składającym się z dwóch wektorów trójwymiarowych a 
1
​
 ,a 
2
​
 ∈R 
3
  dla każdego z 24 stawów szkieletu SMPL. Przeglądarka musi dokonać konwersji tych reprezentacji do macierzy rotacji 3×3, a następnie do kwaternionów (THREE.Quaternion), które są natywnie rozumiane przez system animacji Three.js.   

Proces ten realizuje się za pomocą ortonormalizacji Zhou (Gram-Schmidt). Dla danych wejściowych a 
1
​
  i a 
2
​
 , algorytm konstruuje trzy ortogonalne wektory jednostkowe g 
1
​
 ,g 
2
​
 ,g 
3
​
 , reprezentujące kolumny końcowej macierzy rotacji R∈R 
3×3
 :   

g 
1
​
 = 
∥a 
1
​
 ∥
a 
1
​
 
​
 
g 
2
​
 = 
∥a 
2
​
 −(g 
1
​
 ⋅a 
2
​
 )g 
1
​
 ∥
a 
2
​
 −(g 
1
​
 ⋅a 
2
​
 )g 
1
​
 
​
 
g 
3
​
 =g 
1
​
 ×g 
2
​
 
Poniższy fragment kodu w języku JavaScript przedstawia zoptymalizowaną implementację tej konwersji dla frameworka Three.js:

JavaScript
import * as THREE from 'three';

/**
 * Konwertuje reprezentację 6-DOF do kwaternionu Three.js przy użyciu ortonormalizacji Zhou.
 * @param {Float32Array} raw6DOF - Tablica 6 wartości reprezentująca rotację 6-DOF (a1, a2)
 * @param {THREE.Quaternion} outQuaternion - Obiekt wyjściowy, do którego zostanie zapisany kwaternion
 */
function convert6DOFToQuaternion(raw6DOF, outQuaternion) {
    const ax = raw6DOF[0], ay = raw6DOF[1], az = raw6DOF[2];
    const bx = raw6DOF[3], by = raw6DOF[4], bz = raw6DOF[5];

    // 1. Obliczenie g1 (normalizacja pierwszego wektora)
    const lenA = Math.hypot(ax, ay, az);
    if (lenA < 1e-6) {
        outQuaternion.identity();
        return;
    }
    const g1x = ax / lenA;
    const g1y = ay / lenA;
    const g1z = az / lenA;

    // 2. Rzutowanie b na g1 w celu uzyskania składowej ortogonalnej
    const dot = bx * g1x + by * g1y + bz * g1z;
    const projx = bx - dot * g1x;
    const projy = by - dot * g1y;
    const projz = bz - dot * g1z;

    // 3. Obliczenie g2 (normalizacja rzutowanego wektora)
    const lenProj = Math.hypot(projx, projy, projz);
    let g2x = 0, g2y = 0, g2z = 0;
    if (lenProj > 1e-6) {
        g2x = projx / lenProj;
        g2y = projy / lenProj;
        g2z = projz / lenProj;
    }

    // 4. Obliczenie g3 (iloczyn wektorowy g1 x g2)
    const g3x = g1y * g2z - g1z * g2y;
    const g3y = g1z * g2x - g1x * g2z;
    const g3z = g1x * g2y - g1y * g2x;

    // 5. Utworzenie macierzy rotacji 3x3 i konwersja do kwaternionu
    const matrix = new THREE.Matrix4();
    matrix.set(
        g1x, g2x, g3x, 0,
        g1y, g2y, g3y, 0,
        g1z, g2z, g3z, 0,
          0,   0,   0, 1
    );

    outQuaternion.setFromRotationMatrix(matrix);
}
Wyznaczone kwaterniony są następnie aplikowane bezpośrednio do powiązanych kości modelu trójwymiarowego w pętli renderowania:

JavaScript
// Mapowanie stawów SMPL (np. dla kości prawej ręki)
const rightElbowBone = avatarMesh.skeleton.getBoneByName("right_elbow");
if (rightElbowBone) {
    convert6DOFToQuaternion(frameData.joints[18], rightElbowBone.quaternion); // Przykładowy indeks stawu 18
}
Synchronizacja odtwarzania i kontrolki użytkownika
Klasyczna pętla aktualizacji animacji (AnimationMixer.update(delta)) oparta na wewnętrznym zegarze procesora (clock.getDelta()) wykazuje tendencję do desynchronizacji z plikiem audio z upływem czasu. Wynika to z faktu, że mechanizmy dekodowania audio w przeglądarce działają na osobnym, niskopoziomowym wątku sprzętowym, podczas gdy pętla renderowania WebGL jest podatna na fluktuacje wydajnościowe wątku głównego (Main Thread).   

Rozwiązaniem tego problemu jest implementacja synchronizacji sterowanej czasem audio (Audio-Driven Animation Sync). W tym podejściu jedynym źródłem czasu (Master Clock) jest właściwość currentTime natywnego obiektu HTML5 AudioContext lub elementu <audio>. W pętli renderowania mikser animacji nie jest aktualizowany o relatywną deltę czasu, lecz wymusza się jego bezwzględną synchronizację:

JavaScript
function tick() {
    requestAnimationFrame(tick);
    
    if (audioElement && !audioElement.paused) {
        const audioTime = audioElement.currentTime;
        // Bezpośrednie ustawienie czasu miksera animacji Three.js
        animationMixer.setTime(audioTime);
    }
    
    renderer.render(scene, camera);
}
Implementacja kontrolek interaktywnych opiera się na bezpośrednim manipulowaniu parametrami odtwarzacza audio, co automatycznie (dzięki powyższej pętli) synchronizuje ruch awatara:

Pauza/Odtwarzanie: Wywołanie metod audioElement.play() lub audioElement.pause().

Przewijanie (Scrubbing): Podpięcie zdarzenia zmiany pozycji suwaka czasu do właściwości audioElement.currentTime. Dynamiczna aktualizacja czasu audio natychmiast wymusza przejście awatara do adekwatnej klatki ruchu, nawet gdy odtwarzanie jest wstrzymane.

Zmiana tempa (Slow-motion/Speed-up): Modyfikacja właściwości audioElement.playbackRate (np. zakres od 0.5x do 1.5x). Umożliwia to precyzyjną naukę skomplikowanych figur tanecznych, przy czym ruch awatara automatycznie spowalnia lub przyspiesza z zachowaniem idealnej synchronizacji rytmicznej.

Obrót kamery 360 stopni: Wykorzystanie komponentu THREE.OrbitControls. Aby zapobiec "uciekaniu" awatara z kadru podczas wykonywania kroków postępowych (translacja root joint), punkt centralny kamery (controls.target) jest w każdej klatce dynamicznie aktualizowany o współrzędne pozycji bioder awatara, z zastosowaniem lekkiego filtrowania dolnoprzepustowego w celu wygładzenia ruchu pionowego.

Offline-first i możliwości PWA
Wykorzystanie Service Workers, Cache API i IndexedDB
W sali treningowej, która często charakteryzuje się ograniczonym zasięgiem sieciowym (grube ściany, lokalizacja w podziemiach), aplikacja musi oferować pełną funkcjonalność offline-first. Architektura danych PWA rozdziela zasoby statyczne od generowanych dynamicznie:

+---------------------------------------------------------------------------------------+
|                                    ARCHITEKTURA OFFLINE                               |
+------------------------------------+--------------------------------------------------+
| API / TYP PRZECHOWALNI             | PRZEZNACZENIE I ZAWARTOŚĆ                         |
+------------------------------------+--------------------------------------------------+
| Cache API                          | Powłoka aplikacyjna (App Shell):                 |
| (Zarządzane przez Service Worker)  | - Pliki HTML, CSS, JS                             |
|                                    | - Trójwymiarowe modele awatarów (GLB) |
|                                    | - Zewnętrzne biblioteki (Three.js, Draco SDK)    |
+------------------------------------+--------------------------------------------------+
| IndexedDB                          | Dane dynamiczne użytkownika:                     |
| (Zintegrowana baza NoSQL)          | - Wygenerowane trajektorie ruchu (ArrayBuffers)  |
|                                    | - Powiązane pliki dźwiękowe (Audio Blobs)        |
|                                    | - Metadane treningowe (nazwy utworów, historia)  |
+------------------------------------+--------------------------------------------------+
Service Worker, zaimplementowany z użyciem biblioteki Workbox, stosuje strategię Cache-First dla zasobów statycznych, eliminując konieczność odpytywania sieci o pliki silnika 3D czy modele bazowe przy każdym uruchomieniu aplikacji.

Pliki dynamiczne (audio oraz sekwencje ruchu) są pobierane z serwera, a następnie zapisywane transakcyjnie w lokalnej bazie IndexedDB. Podczas prób odtworzenia danej choreografii, aplikacja w pierwszej kolejności weryfikuje obecność pary kluczy (AudioBlob + MotionBuffer) w IndexedDB, umożliwiając natychmiastowe odtworzenie treningu bez udziału sieci.

Ograniczenia i różnice systemowe (iOS vs Android)
Implementacja zaawansowanego PWA w 2026 roku napotyka na asymetrię możliwości systemów operacyjnych iOS (WebKit) oraz Android (Blink/Chromium). Różnice te determinują sposób projektowania aplikacji i wymagają wdrożenia mechanizmów obronnych (fallbacks).   

Poniższa tabela przedstawia szczegółowe porównanie platform mobilnych w kontekście wymagań aplikacji:

Funkcjonalność	Status na iOS (WebKit)	Status na Android (Chromium)	Wpływ na aplikację i metody obejścia
Instalacja PWA	
Wyłącznie ręczna ("Udostępnij" -> "Dodaj do ekranu głównego"). Brak natywnego monitu instalacji.

Pełna automatyzacja (obsługa zdarzenia beforeinstallprompt).	
Konieczność implementacji dedykowanego, animowanego samouczka dla użytkowników iOS.

Zarządzanie pamięcią (Storage)	
Safari 17+ zniosło twardy limit 50 MB na rzecz udziału wolnej przestrzeni. Reguła 7 dni: dane mogą zostać usunięte po 7 dniach nieaktywności.

Do 60% wolnego miejsca na dysku. Brak automatycznego usuwania danych po okresie bezczynności.	
Wywołanie navigator.storage.persist() w celu zażądania od systemu gwarancji trwałego przechowywania danych (Persistent Storage API).

Praca w tle (Background)	
Brak wsparcia dla Background Sync i Background Fetch. Blokowanie skryptów po zminimalizowaniu aplikacji.

Pełna obsługa procesów w tle.	
Przesyłanie plików audio i pobieranie ruchu musi odbywać się przy otwartej aplikacji. Wymuszenie blokady wygaszania ekranu (Screen Wake Lock API) podczas odtwarzania.

Powiadomienia Push	
Dostępne od iOS 16.4+, ale wyłącznie dla zainstalowanych PWAs.

Dostępne bezpośrednio z poziomu przeglądarki.	
Aplikacja musi zablokować monit o powiadomienia do czasu zainstalowania PWA na ekranie głównym.

  
Analiza wąskich gardeł i ryzyka techniczne
Analiza opóźnień (Latency) i przepustowości
Aby interaktywny trener AI spełniał oczekiwania użytkowników, łączny czas od przesłania dźwięku do rozpoczęcia odtwarzania wizualizacji 3D (Round-Trip Time) nie powinien przekraczać 5 sekund. Poniższa tabela przedstawia dekompozycję opóźnień dla różnych standardów sieciowych:

Faza procesu	Przebieg i opis techniczny	Czas trwania (Sieć 5G / Wi-Fi)	Czas trwania (Sieć 4G / LTE - Słaby zasięg)	Wąskie gardła i metody mitigacji
1. Nagranie i Kompresja	Lokalny resampling audio i eksport do formatu Opus w PWA.	~100 ms	~100 ms	Nadmierne obciążenie wątku głównego. Rozwiązanie: Przeniesienie kodeka Opus do osobnego procesu Web Worker.
2. Przesłanie Audio (Uplink)	Upload skompresowanego pliku audio (~30s, średni rozmiar pliku 240 KB przy 64 kbps).	~200 ms	~1500 ms	Niska przepustowość pasma wysyłania (upload). Rozwiązanie: Dynamiczne ograniczenie czasu trwania wysyłanego klipu do maksymalnie 15-20 sekund dla celów treningowych.
3. Ekstrakcja Cech Audio	
Generowanie osadzeń (embeddings) przez model AI na backendzie.

~400 ms	~400 ms	
Jukebox jako krytyczny czynnik blokujący. Rozwiązanie: Zastąpienie Jukebox lekkim modelem MERT lub całkowite przejście na Librosę.

4. Inferencja Modelu EDGE	
Przejście grafu dyfuzyjnego (20-30 kroków próbkowania DDIM na GPU chmurowym).

~1200 ms	~1200 ms	
Wydajność obliczeniowa GPU przy współbieżności. Rozwiązanie: Kompilacja TensorRT, optymalizacja batchingu w Triton Inference Server.

5. Pobranie Wyniku (Downlink)	
Transfer binarnego ArrayBuffer o rozmiarze ~1 MB z serwera do klienta.

~150 ms	~800 ms	Blokowanie parsowania danych. Rozwiązanie: Zastosowanie surowego bufora binarnego, ładowanego bez konieczności odkodowywania struktur tekstowych.
6. Inicjalizacja i Renderowanie	
Ortonormalizacja Zhou 6-DOF, aktualizacja kości szkieletu, start animacji i audio.

~50 ms	~50 ms	Opóźnienia inicjalizacji Web Audio API. Rozwiązanie: Pre-load i wcześniejsza inicjalizacja kontekstu audio przy pierwszej interakcji użytkownika.
Łączne opóźnienie (Round-trip Latency)	Od wyzwolenia akcji do startu wizualnego treningu.	~2.1 sekundy	~4.05 sekundy	Wszystkie wskaźniki mieszczą się w pożądanym limicie czasowym (< 5 sekund).
  
Zgodność renderowania WebGL na urządzeniach mobilnych
Renderowanie animacji szkieletowej w czasie rzeczywistym na urządzeniach mobilnych generuje znaczne obciążenie termiczne i energetyczne, co może prowadzić do dławienia częstotliwości taktowania GPU (thermal throttling). Główne ryzyka oraz metody ich mitygacji obejmują:   

Skinning na CPU vs GPU: Obliczanie deformacji wierzchołków siatki awatara na podstawie pozycji kości (skinning) realizowane przez CPU drastycznie obniża wydajność. Konieczne jest wymuszenie skinningu sprzętowego na GPU (Vertex Shader Skinning), co w Three.js realizowane jest automatycznie poprzez klasę THREE.SkinnedMesh, pod warunkiem zachowania zgodności z limitami rejestrów stałych (uniforms) procesorów graficznych urządzeń mobilnych.   

Złożoność geometryczna i cienie: Modele postaci importowane z zewnętrznych baz (np. Mixamo) posiadają często zbyt gęstą siatkę (powyżej 50k wierzchołków) i ciężkie materiały. Rekomenduje się rygorystyczne uproszczenie siatki za pomocą modyfikatora Decimate w programie Blender do poziomu poniżej 10 000 wierzchołków. Należy zrezygnować z dynamicznego generowania cieni w czasie rzeczywistym na rzecz cieni wypalonych w teksturze podłoża (shadow maps baking) lub uproszczonego cienia kołowego (fake shadow projection).   

Optymalizacja tekstur: Wykorzystanie tekstur o rozdzielczości 2K/4K szybko wysyca pamięć VRAM urządzeń mobilnych. Należy ograniczyć albedo i mapy normalnych do maksymalnego rozmiaru 1024x1024 pikseli, a mapy szorstkości i metaliczności do 512x512 pikseli. Wskaźnik filtrowania anizotropowego (renderer.capabilities.getMaxAnisotropy()) powinien być ustawiony konserwatywnie (maksymalnie na wartość 2 lub 4), aby uniknąć nadmiernego obciążenia jednostki cieniowania tekstur.   

Podsumowanie i rekomendacje technologiczne
Wdrożenie modelu EDGE jako silnika trenera AI w strukturze Progressive Web App dedykowanej dla szkoły tańca jest w pełni wykonalne przy zastosowaniu nowoczesnych wzorców inżynierii oprogramowania i uczenia maszynowego. Kluczem do sukcesu jest eliminacja wąskich gardeł obliczeniowych poprzez optymalizację potoku danych.

Poniższy wykaz zbiera kluczowe rekomendacje technologiczne dla opisanego wdrożenia:

Potok przetwarzania 3D (Frontend): Jako bibliotekę bazową należy wybrać Three.js ze względu na wysoką wydajność modułu animacji szkieletowej SkinnedMesh i mały narzut pamięciowy w porównaniu do Babylon.js. Wszystkie zasoby 3D (awatary postaci) powinny być dostarczane w formacie GLB skompresowanym biblioteką Draco.   

Format wymiany danych: Należy odrzucić tekstowy format JSON na rzecz surowego, skompresowanego strumienia binarnego ArrayBuffer (Float32), niosącego wyłącznie wektory rotacji 6-DOF i translację korzenia. Konwersja do kwaternionów przy użyciu metody ortonormalizacji Zhou musi odbywać się bezpośrednio na kliencie, co eliminuje narzut transferu sieciowego.   

Architektura chmurowa backendu: W środowisku produkcyjnym (np. Vertex AI) rekomenduje się wdrożenie serwera Triton Inference Server. Pozwala to na spakowanie potoku (ekstrakcja cech + dyfuzja EDGE) w jeden zoptymalizowany model złożony (Ensemble Model), minimalizując opóźnienia przesyłu danych pomiędzy CPU a GPU.   

Optymalizacja modelu AI: W celu zapewnienia czasu odpowiedzi poniżej 5 sekund, konieczne jest zastąpienie klasycznego próbkowania DDPM (1000 kroków) algorytmem DPM-Solver lub DDIM ograniczonym do 20–30 kroków. Wagę modeli należy poddać kwantyzacji do formatu FP16. Jako alternatywny, lekki ekstraktor cech muzycznych należy rozważyć model MERT lub bibliotekę Librosa w celu całkowitego pominięcia kosztownego Jukeboxa w potoku online.   

Strategia offline i synchronizacja: Architektura PWA musi opierać się na synchronizacji animacji z czasem zegara sprzętowego audio (currentTime), co zapobiega rozjeżdżaniu się obrazu i dźwięku przy spadkach wydajności urządzenia. Wykorzystanie Service Workers do buforowania App Shell, bazy IndexedDB do lokalnego przechowywania par (AudioBlob + MotionBuffer) oraz implementacja Persistent Storage API na iOS zagwarantują stabilne działanie systemu w salach treningowych pozbawionych łączności sieciowej.   

