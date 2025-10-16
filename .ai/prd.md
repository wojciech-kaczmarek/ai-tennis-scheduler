# Product Requirements Document (PRD) - Generator Harmonogramów Tenisowych

## 1. Wprowadzenie

### 1.1. Problem
Manualne tworzenie harmonogramów meczów dla amatorskich turniejów tenisowych jest procesem czasochłonnym, podatnym na błędy i często prowadzi do niesprawiedliwych lub nielogicznych harmonogramów. Organizatorzy, zazwyczaj grupy znajomych, potrzebują prostego narzędzia, które zautomatyzuje ten proces, oszczędzając czas i zapewniając sprawiedliwe warunki gry dla wszystkich uczestników.

### 1.2. Cel produktu
Celem produktu jest stworzenie aplikacji webowej, która automatycznie generuje zoptymalizowane harmonogramy meczów tenisowych dla turniejów singlowych i deblowych, minimalizując konflikty i czas oczekiwania graczy.

### 1.3. Grupa docelowa
Główną grupą docelową są nieformalne grupy znajomych oraz organizatorzy małych, amatorskich turniejów tenisowych.

## 2. Funkcjonalności MVP

### 2.1. Zarządzanie turniejami
- Użytkownik może tworzyć nowe turnieje, podając ich nazwę.
- Użytkownik może przeglądać listę swoich zapisanych turniejów.
- Zapisane turnieje nie mogą być edytowane. Użytkownik może je jedynie usunąć.

### 2.2. Konta użytkowników
- Prosty system rejestracji i logowania oparty na adresie e-mail i haśle.
- Użytkownik po zalogowaniu ma dostęp do swoich zapisanych turniejów.

### 2.3. Generowanie harmonogramu
- Obsługa dwóch typów turniejów: singlowych i deblowych.
- **Turniej singlowy:** rozgrywany w systemie "każdy z każdym". System generuje od razu pełen harmonogram wszystkich meczów.
- **Turniej deblowy:** system generuje harmonogram, maksymalizując liczbę unikalnych interakcji między graczami (różni partnerzy i różni przeciwnicy).
- Możliwość wprowadzenia imion i nazwisk graczy (opcjonalnie). Jeśli nie zostaną podane, system użyje oznaczeń zastępczych (np. "Gracz 1").
- Użytkownik określa liczbę dostępnych kortów.
- Limity dla MVP: od 4 do 24 graczy, od 1 do 6 kortów.
- W turniejach deblowych liczba graczy musi być podzielna przez cztery.

### 2.4. Logika optymalizacji harmonogramu
Algorytm generujący harmonogram kieruje się następującymi priorytetami:
1.  **Priorytet 1:** Unikanie sytuacji, w której ten sam zawodnik gra kilka meczów z rzędu.
2.  **Priorytet 2:** Optymalne rozłożenie gier na dostępnych kortach, aby zminimalizować ich bezczynność.
- Jeśli idealny harmonogram jest niemożliwy do osiągnięcia, system generuje najlepszy możliwy wariant i informuje o tym użytkownika.

### 2.5. Edycja i akceptacja harmonogramu
- Po wygenerowaniu harmonogramu użytkownik widzi jego podgląd.
- Użytkownik ma możliwość manualnej edycji harmonogramu, która ogranicza się do zmiany numeru kortu oraz kolejności meczu na danym korcie.
- Użytkownik może zaakceptować harmonogram przyciskiem "Użyj tego planu" lub odrzucić go, edytując lub generując ponownie.

## 3. Ścieżka użytkownika (User Flow)
1.  Użytkownik loguje się lub rejestruje konto.
2.  Na pulpicie klika "Stwórz nowy turniej".
3.  Postępuje zgodnie z krokami kreatora:
    a. Podaje nazwę turnieju.
    b. Wybiera typ: singiel lub debel.
    c. Dodaje graczy (wpisując ich imiona lub tylko określając ich liczbę).
    d. Podaje liczbę dostępnych kortów.
4.  Klika "Generuj harmonogram".
5.  System prezentuje wygenerowany plan.
6.  Użytkownik może (opcjonalnie) dokonać drobnych edycji.
7.  Użytkownik klika "Użyj tego planu", co powoduje zapisanie turnieju na jego koncie.

## 4. Kryteria sukcesu
- **Wskaźnik akceptacji AI:** 75% harmonogramów generowanych przez AI jest akceptowanych przez użytkowników (mierzone przez kliknięcie "Użyj tego planu" bez wcześniejszej edycji).
- **Wskaźnik użycia AI:** 75% wszystkich tworzonych harmonogramów w systemie jest generowanych przy użyciu AI (a nie tworzonych w pełni manualnie, jeśli taka opcja pojawiłaby się w przyszłości).

## 5. Co NIE wchodzi w zakres MVP
- Przechowywanie wyników meczów.
- Generowanie harmonogramu z uwzględnieniem szacowanego czasu trwania meczów.
- Współdzielenie harmonogramów między różnymi użytkownikami.
- Aplikacje mobilne (tylko aplikacja webowa).
- Eksport harmonogramu do plików (np. PDF, CSV).
- Automatyczne zapisywanie szkiców turniejów.
