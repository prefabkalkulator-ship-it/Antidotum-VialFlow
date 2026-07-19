# AI Handover: Antidotum-VialFlow

Witaj, nowa instancjo AI! Zanim zaczniesz modyfikować ten projekt, **ZATRZYMAJ SIĘ I PRZECZYTAJ TEN DOKUMENT OD DESKI DO DESKI**.
Twoim NAJWAŻNIEJSZYM pierwszym zadaniem jest przeczytanie pliku `AGENTS.md` znajdującego się w głównym folderze projektu. Zawiera on absolutnie krytyczne, nienaruszalne reguły dotyczące sposobu pisania kodu i tworzenia poprawek.

## Architektura Aplikacji
Aplikacja jest potężnym systemem dla Szkoły Tańca Antidotum, obsługującym 3 różne perspektywy/tryby dostępu dla różnych ról. Cały front-end działa na jednym kodzie (Expo / React Native Web) kompilowanym i w pełni utrzymywanym w chmurze (Google Cloud Run + Firebase).

1. **Wersja Mobilna Ucznia/Rodzica (Backend/Public)**: 
   Główna aplikacja PWA, uruchamiana pod adresem Cloud Run. Obsługuje logowanie kodem PIN, skanowanie kodów QR, płatności, odrabianie zajęć i rozmowy ze zintegrowanym Asystentem AI.
2. **Antidotum Adm (Panel Administratora)**: 
   Uruchamiany przez wpisanie specjalnych danych dostępowych. Służy do zarządzania użytkownikami, eventami, listą obecności i podglądem statystyk. Dostępny z Firebase Hosting pod domeną web.app.
3. **Antidotum QR (Skaner na Tablet w Recepcji)**: 
   Aplikacja zainstalowana jako PWA na fizycznym tablecie w recepcji, przeznaczona wyłącznie do weryfikacji i skanowania kodów z aplikacji uczniów.

Z technicznego punktu widzenia:
- Katalog `mobile-app` zawiera kod React Native (Expo). Główna i jedyna potężna logika sterująca trybami (Admin, Uczeń, Tablet) znajduje się w gigantycznym `App.tsx`.
- Katalog `backend` to Node.js (Express), który jednocześnie stanowi serwer API dla danych, serwer plików statycznych (serwujący skompilowany folder `public` z kodem mobilnym), i obsługuje endpointy płatności oraz zapytania do chmury RAG (AI).

## Ostatnie Poprawki i Wyzwania (Błędy Czatu)
W ostatnich sesjach naprawialiśmy bardzo specyficzne i uciążliwe błędy w Asystencie AI (Wersja Mobilna Ucznia). Zwróć na nie szczególną uwagę, abyś nigdy ich przypadkowo nie cofnął. Pamiętaj, jak ostatecznie je rozwiązaliśmy:

1. **Brak auto-scrollowania po pojawieniu się wiadomości od AI**
   *Problem:* Chat nie zjeżdżał na sam dół automatycznie. Próba dodania `onContentSizeChange={...}` na komponencie `<ScrollView>` całkowicie zepsuła aplikację na platformie Web, powodując `ReferenceError` i czarny ekran (React crashował w trakcie pierwszego renderowania, ponieważ metoda `scrollToEnd` na `chatScrollRef` była modyfikowana poza cyklem życia).
   *Ostateczne Rozwiązanie:* Dodano zmienną `chatScrollRef`, a następnie stworzono 100% bezpieczny `useEffect` wyzwalany każdą zmianą w tablicy wiadomości. Posiada on dodatkowe zabezpieczenie i opóźnienie (`setTimeout(..., 100)`), a samo wywołanie scrollowania ma weryfikację `typeof chatScrollRef.current.scrollToEnd === 'function'`. Dzięki temu działa płynnie i bez błędów niezależnie od przeglądarki.

2. **Działanie przycisku "Stop" dla Trenera Głosowego (TTS)**
   *Problem:* Brak było niezależnego, natychmiastowego przycisku Stop dla AI asystenta. Przycisk miał pojawiać się od razu pod tekstem najświeższej (i właśnie czytanej) wiadomości.
   *Ostateczne Rozwiązanie:* Wprowadzono w stanie zmienną `speakingMsgId`. Do funkcji `speakText(text, msgId)` dodano przekazywanie unikalnego ID wiadomości. Odtwarzacz wykorzystuje teraz `window.speechSynthesis.cancel()` (Web) oraz `Speech.stop()` (Nativ).

3. **Glitch z duplikującym się tekstem STT (Speech-to-Text)**
   *Problem:* Podczas używania funkcji nasłuchu na przeglądarkach w Androidzie, silnik wypluwał błędne stringi ("Ile Ile kosztują zajęcia" albo "IleIleIlekosztujązajęcia"). Było to spowodowane błędem przeglądarkowych API, gdzie transkrypty nakładały się na siebie, w rezultacie zwracając powtarzające się początki zdań.
   *Ostateczne Rozwiązanie:* Napisano potężny własny algorytm (Overlap Merge - Inteligentne łączenie transkryptów z usuwaniem nakładających się fraz). Pętla w `recognition.onresult` analizuje dotychczasowy ciąg znaków, porównuje jego końcówkę z początkiem nowo otrzymanej frazy i wylicza "punkt styku" (overlap). Następnie skleja je obcinając nachodzący zduplikowany fragment, co gwarantuje krystalicznie czysty tekst niezależnie od błędów w silnikach poszczególnych systemów mobilnych.

**UWAGA: Przypadkowe usunięcie referencji `const chatScrollRef = useRef(...)` albo powrót do natywnego łączenia transkryptów doprowadzi natychmiast do powrotu `Czarnych Ekranów` i gliczujących duplikatów głosu.**

## Gdzie i jak Zabezpieczono Kod
1. **GitHub Repository**: Całość kodu jest spushowana na zewnętrznym zdalnym repozytorium GitHub na gałęzi `main`. Przed wykonaniem każdej grubszej czynności związanej z nowymi funkcjami **zawsze pobieraj ewentualne zdalne modyfikacje** (`git pull`).
2. Kod jest także lokalnie wersjonowany. Zmiany kompilowane są za pomocą polecenia `npx expo export -p web` (odpalane z wnętrza /mobile-app), po czym folder `dist` jest kopiowany do `/backend/public`.
3. Backend (razem ze skompilowaną w folderze public mobilną appką) jest na bieżąco deployowany na Google Cloud Run za pomocą potężnej komendy `gcloud run deploy ... --source .`.

Zanim ruszysz z jakimikolwiek nowymi zmianami w kodzie - przeczytaj plik `AGENTS.md`. Nie ruszaj sprawdzonych mechanizmów, upewnij się, że modyfikacje są mikro-chirurgiczne i dbaj o czystość struktury.

Powodzenia!
