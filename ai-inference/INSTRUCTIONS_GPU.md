# Instrukcja Pełnego Wdrożenia Modelu AI EDGE na GPU

Gratulacje, Twój system zyskał architekturę mikrousług gotową do wdrożenia najwyższej klasy modeli AI z obsługą uczenia maszynowego (PyTorch). 

Skrypty, które napisałem w folderze `ai-inference/`, działają aktualnie jako "Pusta skorupa" – odpytują się nawzajem tak, jak docelowy system, ale sam procesor "sztucznej inteligencji" oznaczyliśmy jako wirtualny, dopóki nie pobierzesz ogromnych plików modeli maszynowych (Checkpointów).
Jeśli wdrożyłeś projekt już na Cloud Run to zauważyłeś, że nie rzuca błędów, po prostu odczekuje kilka sekund i oddaje testowy układ `edge_generated_test.glb`.

## Co musisz zrobić ręcznie, aby odpalić prawdziwe AI:

Ponieważ uruchomienie algorytmów takich jak EDGE (Editable Dance Generation) wymaga drogiej infrastruktury i gigabajtów danych, z uwagi na Twoje MVP przygotowałem zarys procesu poniżej.
Gdy zdecydujesz, że budżet pozwala na opłacenie maszyny z GPU (np. 1-2 złote za godzinę na Google Cloud), wykonaj te kroki:

### 1. Pozyskanie Wag Modelu (Model Checkpoints)
Algorytmy EDGE lub MotionDiffuse wykorzystują wytrenowane na tysiącach godzin tańca wagi.
- Musisz zdobyć plik konfiguracyjny sieci, np. `edge_v1.pt`. Waży on zwykle kilkanaście Gigabajtów.
- Wewnątrz katalogu `ai-inference` utwórz folder `checkpoints/`.
- Wrzuć tam swój plik modelu. Skrypt Pythona (patrz: `edge_model.py`) automatycznie sprawdzi, czy ten plik istnieje na dysku podczas startu aplikacji (Cold Start).

### 2. Środowisko PyTorch + CUDA
Modele uczenia maszynowego działają tylko w pełni pod obecność sterowników Nvidia CUDA:
- Jeśli wdrażasz to na własnym serwerze, musisz mieć kartę RTX (najlepiej z minimum 16GB VRAM, polecana RTX 3090/4090 lub T4/L4 na serwerach).
- Przejdź do pliku `requirements.txt` i odznacz (zainstaluj) oficjalną dystrybucję PyTorch:
```txt
torch --index-url https://download.pytorch.org/whl/cu118
torchaudio
transformers
librosa
numpy
scipy
```
*(Uwaga: w pliku `requirements.txt` dodałem je na dole jako zakomentowane, aby nie popsuć chmury, w której obecnie to wdrażasz – darmowe konta na GCP nie uciągną 6 GB obrazu Dockera PyTorch).*

### 3. Logika Sieci (Model Inference)
W pliku `edge_model.py`, przygotowałem odpowiednią pętlę i strukturę kodu (`load_model`, `generate_dance_for_audio`).
- Musisz w to miejsce wkleić lub podlinkować repozytorium GitHub ze źródłem danego modelu (np. z repo EDGE Stanfordu).
- Odkomentuj importy u samej góry pliku (jak `from smplx import SMPLLayer`) po zaimportowaniu bibliotek.

### 4. Alternatywy Cloud GPU (Polecane do skalowania)
Gdy model działa poprawnie u Ciebie na dysku (Localhost), zalecaną ścieżką publikacji tego kontenera w Internecie (by rozmawiał z bazowym Node.js na Cloud Run) są usługi:
- **RunPod** (Serverless Endpoint)
- **Modal.com** (Genialne do Pythona Serverless)
- **Google Cloud Run (NVIDIA L4)** (wersja zamknięta Beta, kosztuje $0.5 za godzinę).

Jeśli w którymś z momentów tego procesu trafisz na problem ze strukturą danych SMPL do GLB, po prostu wróć tutaj, podaj mi komunikat błędu z terminala i dostroję architekturę `edge_model.py` pod dokładny model, którego zacząłeś używać. Powodzenia w trenowaniu sztucznego trenera!
