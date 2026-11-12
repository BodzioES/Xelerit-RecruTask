# MOVEIT — SPECYFIKACJA MVP FULL-STACK

## 1. Cel projektu

Stwórz aplikację internetową MoveIt — platformę jednej firmy umożliwiającą wynajem samochodów dostawczych oraz zamawianie usług transportowych i przeprowadzkowych.

Projekt jest zadaniem rekrutacyjnym Full-Stack Developer. Ma pokazać umiejętności w zakresie:

- projektowania i implementacji backendu;
- tworzenia nowoczesnego interfejsu frontendowego;
- projektowania relacyjnej bazy danych;
- tworzenia REST API;
- implementowania logiki biznesowej;
- integracji z mapami;
- zarządzania dostępnością pojazdów i pracowników;
- testowania;
- konteneryzacji.

To ma być *MVP, a nie rozbudowany system komercyjny*. Nie dodawaj funkcji tylko po to, żeby aplikacja wyglądała na bardziej rozbudowaną.

Priorytetem jest poprawnie działający proces zamówienia usługi od początku do końca.

## 2. Koncepcja MoveIt

MoveIt to platforma jednej firmy transportowej działającej na terenie Trójmiasta oraz w promieniu około 30 km poza nim.

Nie tworzymy marketplace'u z wieloma firmami. Aplikacja reprezentuje jedną firmę posiadającą własną flotę pojazdów i ograniczoną liczbę pracowników.

Klient może:

1. Wybrać rodzaj usługi.
2. Określić lokalizację i termin.
3. Zobaczyć dostępne pojazdy.
4. Sprawdzić parametry pojazdu.
5. Określić, czy potrzebuje pracowników do pomocy.
6. Wypełnić informacje dotyczące przewożonych rzeczy lub przeprowadzki.
7. Zobaczyć cenę.
8. Złożyć rezerwację.

System musi kontrolować dostępność zarówno samochodów, jak i pracowników. Nie można przyjąć dwóch zleceń wymagających tych samych zasobów w nakładającym się czasie.

## 3. Rodzaje usług

W aplikacji dostępne będą trzy rodzaje usług.

### 3.1. Wynajem samochodu — Self Drive

Klient wynajmuje samochód dostawczy i samodzielnie nim kieruje.

Możliwości:

- wybór pojazdu;
- wybór daty i godziny rozpoczęcia;
- wybór daty i godziny zakończenia;
- wybór miejsca odbioru;
- wybór miejsca zwrotu;
- sprawdzenie dostępności;
- podanie danych kontaktowych;
- podsumowanie ceny;
- złożenie rezerwacji.

Odbiór pojazdu odbywa się za pomocą fizycznej skrytki na klucze zamontowanej w samochodzie.

Kod dostępu składa się z 6 cyfr. Backend generuje kod, natomiast kierowca ręcznie ustawia go na skrytce znajdującej się w pojeździe i przekazuje klientowi instrukcje odbioru.

Nie integrujemy aplikacji z elektronicznym zamkiem ani fizyczną skrytką. System jedynie generuje i przechowuje kod oraz umożliwia Providerowi przekazanie go klientowi.

### 3.2. Transport z kierowcą — Van + Driver

Klient zamawia transport wraz z kierowcą.

Przykłady:

- przewóz mebli;
- przewóz zakupionego sprzętu AGD;
- transport kartonów;
- przewóz pojedynczych dużych przedmiotów.

Klient określa:

- miejsce załadunku;
- miejsce rozładunku;
- preferowany termin;
- rodzaj przewożonych przedmiotów;
- ewentualne dodatkowe informacje.

System dobiera dostępny pojazd i sprawdza dostępność kierowcy.

### 3.3. Przeprowadzka — Full Moving

Klient zamawia samochód, kierowcę oraz określoną liczbę pracowników do pomocy.

Klient powinien określić:

- rodzaj obiektu;
- rodzaj przewożonych rzeczy;
- orientacyjną liczbę lub ilość przedmiotów;
- liczbę pięter, jeżeli dotyczy;
- czy jest winda, jeżeli dotyczy;
- czy konieczne jest znoszenie rzeczy;
- czy konieczne jest wnoszenie rzeczy;
- liczbę potrzebnych pracowników, jeśli firma pozwala ją wybrać.

Rodzaj obiektu:

- mieszkanie;
- dom;
- biuro;
- magazyn;
- hala;
- lokal usługowy;
- inne.

Dla mieszkania istotne są piętro i winda.

Dla domu, hali lub magazynu należy umożliwić wpisanie dodatkowych informacji zamiast wymuszania wyboru piętra i windy.

Formularz powinien być dynamiczny i pokazywać tylko pola odpowiednie dla wybranego rodzaju obiektu.

## 4. Role użytkowników

W MVP wystarczą dwie role.

### 4.1. Customer

Klient może:

- przeglądać usługi;
- przeglądać dostępne pojazdy;
- składać rezerwacje;
- podawać dane kontaktowe;
- przeglądać swoje rezerwacje, jeśli posiada konto;
- sprawdzać status rezerwacji;
- zobaczyć kod odbioru i instrukcje, jeśli dotyczą jego rezerwacji.

*Rejestracja nie może być wymagana do złożenia zamówienia.*

Klient może złożyć rezerwację jako gość. Podczas zamówienia musi podać:

- imię;
- nazwisko;
- adres e-mail;
- numer telefonu.

Nie ma konieczności zakładania konta.

Opcjonalna rejestracja może zostać dodana, jeśli wystarczy czasu.

### 4.2. Provider

Provider reprezentuje firmę i jej pracowników.

Nie tworzymy oddzielnego panelu administratora.

Provider może:

- przeglądać wszystkie rezerwacje;
- akceptować i odrzucać zamówienia;
- zmieniać statusy rezerwacji;
- zarządzać pojazdami;
- dodawać i edytować pojazdy;
- zarządzać pracownikami;
- określać dostępność pracowników;
- określać dostępność pojazdów;
- zarządzać cenami;
- przeglądać dane klientów i szczegóły zleceń;
- ustawiać instrukcje odbioru i zwrotu pojazdów;
- generować kod do skrytki i przekazywać go kierowcy lub ustawiać go w ramach przygotowania odbioru.

Wszystkie funkcje administracyjne potrzebne w MVP znajdują się w panelu Provider.

Nie twórz osobnej roli admin.

## 5. Design i UX

Aplikacja ma być nowoczesna, minimalistyczna i profesjonalna.

Najważniejsza zasada:

*Nie pokazuj użytkownikowi zbyt wielu informacji naraz. Interfejs ma być prosty, przejrzysty i pozbawiony zbędnych sekcji.*

Unikaj:

- przesadnie rozbudowanej strony głównej;
- pustych sekcji marketingowych;
- dużych bloków tekstu;
- zbędnych kart ze statystykami;
- nadmiaru przycisków;
- niepotrzebnych dekoracji;
- elementów, które nie prowadzą do konkretnego działania.

Preferowany styl:

- jasne tło;
- grafitowe lub granatowe teksty;
- jeden kolor akcentowy;
- delikatne obramowania;
- czytelne formularze;
- estetyczne karty pojazdów;
- odpowiednia ilość przestrzeni;
- responsywność;
- wyraźne statusy.

Interfejs ma prowadzić użytkownika krok po kroku przez proces zamówienia.

Nie pokazuj wszystkich pól rezerwacji na jednej stronie. Podziel proces na logiczne etapy i wyświetlaj tylko informacje potrzebne w danym momencie.

## 6. Strona główna

Strona główna powinna być maksymalnie prosta.

Zawiera:

1. Logo MoveIt i prostą nawigację.
2. Krótkie wyjaśnienie, czym zajmuje się platforma.
3. Główny moduł wyboru usługi i rozpoczęcia zamówienia.
4. Krótką informację o obszarze działania: Trójmiasto + około 30 km.
5. Dane kontaktowe i stopkę.

Nie dodawaj:

- sekcji „Jak to działa”;
- sekcji polecanych pojazdów;
- sekcji korzyści;
- rozbudowanych sekcji marketingowych;
- przypadkowych statystyk;
- treści służących wyłącznie wypełnieniu przestrzeni.

Strona ma umożliwiać szybkie rozpoczęcie zamówienia.

## 7. Proces zamawiania usługi

To najważniejsza część aplikacji.

Proces musi być podzielony na etapy. Nie pytaj klienta o wszystkie informacje od razu. Najpierw zbierz podstawowe dane, następnie pokaż dostępne pojazdy, a później przejdź do szczegółów.

### Etap 1 — wybór usługi

Klient wybiera:

- Self Drive;
- Van + Driver;
- Full Moving.

### Etap 2 — lokalizacja i termin

Dla Self Drive:

- miejsce odbioru;
- miejsce zwrotu;
- data i godzina odbioru;
- data i godzina zwrotu.

Dla Van + Driver i Full Moving:

- miejsce załadunku;
- miejsce rozładunku;
- preferowana data;
- preferowana godzina.

Lokalizacje są wybierane przez wpisanie adresu lub wskazanie punktu na mapie.

Na początku obsługujemy Trójmiasto i obszar do około 30 km poza nim.

### Etap 3 — wybór pojazdu

Po podaniu podstawowych danych aplikacja pokazuje pojazdy, które mogą obsłużyć dane zlecenie.

Każda karta pojazdu zawiera:

- jedno zdjęcie;
- markę i model;
- pojemność przestrzeni ładunkowej;
- maksymalną ładowność;
- liczbę miejsc w kabinie;
- cenę lub informację o sposobie wyceny;
- informację o dostępności.

Klient powinien wiedzieć, czy pojazd jest dostępny i czy jego parametry odpowiadają potrzebom.

Nie dodawaj galerii zdjęć. W MVP jedno zdjęcie na pojazd wystarczy.

Dostępność pojazdu musi wynikać z istniejących rezerwacji.

### Etap 4 — informacje o zleceniu

Dla Self Drive etap ten może być bardzo krótki.

Dla Van + Driver klient podaje:

- co będzie przewożone;
- liczbę lub ilość przedmiotów, jeśli jest to przydatne;
- dodatkowe uwagi.

Dla Full Moving klient podaje:

- typ obiektu;
- listę lub ilość przedmiotów;
- liczbę kartonów, jeżeli dotyczy;
- piętro, jeżeli dotyczy;
- czy jest winda, jeżeli dotyczy;
- czy wymagane jest wniesienie;
- czy wymagane jest zniesienie;
- dodatkowe informacje.

Formularz powinien być dynamiczny. Przykładowo:

- dla mieszkania pokazujemy piętro i windę;
- dla domu nie wymagamy piętra;
- dla hali lub magazynu umożliwiamy opis warunków załadunku.

### Etap 5 — pracownicy

W przypadku Full Moving klient określa zapotrzebowanie na pomocników.

System sprawdza:

- ilu pracowników jest dostępnych;
- czy w danym terminie nie są przypisani do innych zleceń;
- czy liczba pracowników wystarczy do realizacji zlecenia.

Kierowca również jest zasobem, który musi być uwzględniany w dostępności.

Nie można przypisać tej samej osoby do dwóch nakładających się zleceń.

W MVP wystarczy prosta obsługa dostępności i konfliktów terminów. Nie buduj rozbudowanego systemu grafików.

### Etap 6 — wycena

Backend oblicza cenę.

Cena może uwzględniać:

- rodzaj usługi;
- wybrany pojazd;
- czas wynajmu;
- dystans, jeśli ma zastosowanie;
- liczbę pracowników;
- liczbę i rodzaj przedmiotów;
- piętra;
- dostępność windy;
- dodatkowe usługi.

Nie wszystkie elementy muszą od razu wpływać na cenę automatycznie. W MVP można zastosować konfigurowalne reguły cenowe i podstawowe dopłaty.

Backend musi zwracać rozbicie ceny na składniki.

Frontend nie może samodzielnie ustalać ostatecznej ceny.

### Etap 7 — dane klienta

Klient podaje:

- imię;
- nazwisko;
- adres e-mail;
- numer telefonu.

Rejestracja nie jest wymagana.

### Etap 8 — podsumowanie i zamówienie

Klient widzi:

- wybraną usługę;
- pojazd;
- termin;
- lokalizacje;
- dodatkowe opcje;
- dane kontaktowe;
- cenę;
- najważniejsze warunki.

Po potwierdzeniu system tworzy rezerwację. Rezerwacja może wymagać akceptacji przez Provider.

## 8. Dostępność pojazdów i pracowników

To jeden z najważniejszych elementów logiki backendu.

### Pojazdy

Każdy pojazd ma:

- parametry;
- status aktywności;
- istniejące rezerwacje;
- ewentualne okresy wyłączenia z użytku.

System nie może dopuścić do nakładania się rezerwacji tego samego pojazdu.

Należy uwzględnić również czas potrzebny na przemieszczenie pojazdu między miejscem zakończenia jednej usługi i rozpoczęcia kolejnej.

Przykład: jeśli pojazd kończy zlecenie w Gdańsku o 12:00, a kolejne zlecenie zaczyna się w Gdyni o 12:15, system powinien sprawdzić, czy możliwe jest dotarcie na czas.

W MVP można zastosować prosty bufor czasowy lub minimalny czas przygotowania i przemieszczenia pojazdu.

### Pracownicy

Każdy pracownik powinien mieć:

- imię;
- nazwisko;
- rolę lub stanowisko;
- status aktywności;
- przypisane rezerwacje.

Role:

- driver;
- mover.

Przy rezerwacji system sprawdza, czy odpowiednia liczba pracowników jest dostępna.

Nie można przypisać tej samej osoby do dwóch nakładających się zleceń.

### Zasady rezerwacji

Weryfikacja dostępności musi nastąpić:

1. podczas wyszukiwania;
2. ponownie podczas tworzenia rezerwacji.

Tworzenie rezerwacji powinno odbywać się w transakcji bazodanowej. Zadbaj o odporność na równoczesne zamówienia tego samego zasobu.

## 9. Mapa i lokalizacje

Technologie:

- Leaflet;
- React Leaflet;
- OpenStreetMap;
- Geoapify lub Mapbox do geokodowania;
- API routingu, jeśli potrzebne do sprawdzania możliwości przejazdu i obliczania dystansu.

Klient może:

- wpisać adres;
- wybrać podpowiedź;
- kliknąć mapę;
- przesunąć marker;
- potwierdzić punkt.

System zapisuje:

- adres;
- latitude;
- longitude;
- opcjonalny place ID.

W MVP obszar działania to Trójmiasto + około 30 km. System sprawdza, czy wskazany punkt znajduje się w obsługiwanym obszarze.

Mapa służy przede wszystkim do wyboru i potwierdzenia lokalizacji. Nie musimy pokazywać klientowi rozbudowanego podsumowania trasy.

Jeżeli dystans jest potrzebny do kalkulacji ceny, oblicza go backend na podstawie danych z zaufanego API routingu.

Nie naliczaj automatycznie dopłaty tylko dlatego, że punkt zwrotu jest inny niż odbioru. Taka dopłata musi wynikać z rzeczywistych kosztów operacyjnych firmy i ustalonych reguł cenowych.

## 10. Zamówienie jako gość

Nie wymuszaj zakładania konta.

Po złożeniu zamówienia klient powinien otrzymać potwierdzenie na stronie. Powiadomienia e-mail mogą zostać dodane, jeśli wystarczy czasu.

Klient powinien mieć możliwość sprawdzenia statusu rezerwacji przez bezpieczny link lub opcjonalne konto.

W MVP wystarczy:

- formularz zamówienia;
- dane kontaktowe;
- potwierdzenie;
- numer rezerwacji;
- status rezerwacji.

Nie buduj rozbudowanego dashboardu klienta, jeśli nie jest niezbędny do prezentacji głównego procesu.

## 11. Panel Provider

Provider zarządza całą działalnością firmy.

### Dashboard

Prosty widok:

- nowe zamówienia;
- nadchodzące zlecenia;
- aktywne zlecenia;
- dostępne pojazdy.

Nie dodawaj dużej liczby statystyk.

### Zarządzanie pojazdami

Provider może:

- dodawać pojazdy;
- edytować pojazdy;
- dezaktywować pojazdy;
- ustawiać jedno zdjęcie;
- określać markę i model;
- określać pojemność;
- określać ładowność;
- określać liczbę miejsc;
- ustawiać ceny.

### Zarządzanie pracownikami

Provider może:

- dodawać pracowników;
- edytować ich dane;
- określać rolę;
- aktywować i dezaktywować pracowników;
- przeglądać przypisane im zlecenia.

Nie twórz osobnych kont pracowniczych w MVP. Pracownicy są zasobami zarządzanymi przez Provider.

### Zarządzanie zamówieniami

Provider widzi:

- dane kontaktowe klienta;
- wybraną usługę;
- pojazd;
- termin;
- lokalizacje;
- szczegóły ładunku;
- wymaganych pracowników;
- wycenę.

Może:

- zaakceptować zamówienie;
- odrzucić zamówienie;
- zmienić status;
- przypisać pracowników;
- przypisać pojazd;
- przygotować odbiór pojazdu;
- wygenerować kod do skrytki;
- przekazać kierowcy kod i instrukcje;
- ustawić instrukcje odbioru i zwrotu.

### Zarządzanie dostępnością

Provider powinien mieć możliwość:

- wyłączenia pojazdu z użytku;
- ustawienia niedostępności pracownika;
- przeglądania rezerwacji;
- sprawdzania konfliktów terminów.

## 12. Odbiór pojazdu — fizyczna skrytka z kodem

Dla wynajmu Self Drive zastosuj prosty system odbioru kluczy przez fizyczną skrytkę zamontowaną w samochodzie.

Każda rezerwacja Self Drive może posiadać:

- 6-cyfrowy kod dostępu;
- instrukcję lokalizacji skrytki;
- instrukcję odbioru kluczy;
- instrukcję zwrotu pojazdu.

### Sposób działania

1. Provider przygotowuje rezerwację i generuje kod dostępu.
2. Backend generuje losowy, 6-cyfrowy kod.
3. Kierowca otrzymuje kod i ręcznie ustawia go na fizycznej skrytce zamontowanej w samochodzie.
4. Kierowca pozostawia samochód w ustalonym miejscu odbioru.
5. Klient otrzymuje kod oraz instrukcję odbioru w odpowiednim momencie.
6. Klient używa kodu do otwarcia skrytki i odebrania kluczy.

Kod generowany jest przez backend, ale jego fizyczne ustawienie na skrytce odbywa się ręcznie przez kierowcę.

Nie integrujemy się z elektronicznym zamkiem ani nie sterujemy skrytką z poziomu aplikacji. Aplikacja nie musi również potwierdzać, czy kierowca faktycznie ustawił kod na skrytce.

### Bezpieczeństwo kodu

- kod powinien być losowy i trudny do odgadnięcia;
- kod powinien być przechowywany bezpiecznie, najlepiej w postaci hasha;
- kod jest widoczny tylko dla uprawnionych osób;
- kod jest udostępniany klientowi dopiero po przygotowaniu rezerwacji przez Provider;
- kod nie powinien być dostępny publicznie ani przed właściwym terminem odbioru.

Nie dodawaj statusu vehicle_arrived, powiadomień o dotarciu pojazdu ani dodatkowego potwierdzania dostarczenia samochodu.

Obowiązuje wcześniej ustalona data, godzina i miejsce odbioru. Nie potrzebujemy osobnego procesu oznaczania, że pojazd dotarł na miejsce.

Nie dodawaj też automatycznego statusu potwierdzającego zwrot pojazdu przez klienta. Klient ma obowiązek zwrócić samochód przed ustaloną godziną zakończenia wynajmu.

## 13. Statusy zamówień

Proponowane statusy:

- pending — oczekuje na decyzję firmy;
- confirmed — zaakceptowane przez firmę;
- ready_for_pickup — rezerwacja Self Drive jest przygotowana do odbioru, a instrukcje i kod mogą zostać udostępnione klientowi;
- in_progress — realizacja trwa;
- completed — zakończone;
- rejected — odrzucone;
- cancelled — anulowane.

Nie wszystkie statusy muszą być używane w każdym rodzaju usługi.

Dla Self Drive status ready_for_pickup oznacza przygotowanie rezerwacji do odbioru zgodnie z ustalonym terminem. Nie oznacza automatycznego potwierdzenia fizycznego dotarcia pojazdu.

Zaimplementuj kontrolowane przejścia między statusami. Każda zmiana statusu powinna być zapisywana w historii zamówienia.

## 14. Baza danych i backend

### Technologie

- Python;
- FastAPI;
- SQLAlchemy 2.x;
- Pydantic;
- Alembic;
- PostgreSQL.

SQLAlchemy jest ORM-em, a PostgreSQL właściwą bazą danych.

Preferowana architektura: modularny monolit. Nie twórz mikroserwisów.

### Proponowane modele

#### users

- id;
- first_name;
- last_name;
- email;
- password_hash — nullable;
- role — customer lub provider;
- created_at.

Klient gościnny nie musi mieć konta. Dane kontaktowe wymagane do konkretnej rezerwacji powinny być zapisane również w rezerwacji.

#### vehicles

- id;
- brand;
- model;
- year;
- category;
- cargo_volume;
- payload;
- seats;
- description;
- image_url;
- hourly_price;
- daily_price;
- is_active;
- created_at.

#### employees

- id;
- first_name;
- last_name;
- role — driver lub mover;
- is_active;
- created_at.

#### bookings

- id;
- booking_number;
- customer_id — nullable dla gościa;
- customer_first_name;
- customer_last_name;
- customer_email;
- customer_phone;
- vehicle_id;
- service_type;
- start_datetime;
- end_datetime;
- status;
- base_price;
- extras_price;
- total_price;
- customer_notes;
- created_at;
- updated_at.

#### booking_locations

- id;
- booking_id;
- location_type — pickup, return, loading lub unloading;
- address;
- latitude;
- longitude;
- place_id;
- instructions.

#### booking_employees

- id;
- booking_id;
- employee_id;
- assigned_at.

#### booking_items

- id;
- booking_id;
- item_name;
- quantity;
- description.

#### pricing_rules

- id;
- service_type;
- base_price;
- hourly_rate;
- daily_rate;
- price_per_km;
- helper_rate;
- floor_surcharge;
- no_elevator_surcharge;
- additional_service_price.

#### handover_records

- id;
- booking_id;
- access_code_hash;
- pickup_instructions;
- return_instructions;
- created_at.

Nie dodawaj pól potwierdzających automatycznie dotarcie pojazdu lub zwrot przez klienta.

#### booking_events

- id;
- booking_id;
- previous_status;
- new_status;
- changed_by;
- created_at.

Nie twórz wszystkich modeli na siłę. Przed implementacją przeanalizuj, które są konieczne do działającego MVP.

## 15. REST API

Prefiks:

/api/v1

### Pojazdy

GET    /api/v1/vehicles
GET    /api/v1/vehicles/{id}
POST   /api/v1/provider/vehicles
PATCH  /api/v1/provider/vehicles/{id}
DELETE /api/v1/provider/vehicles/{id}

### Pracownicy

GET    /api/v1/provider/employees
POST   /api/v1/provider/employees
PATCH  /api/v1/provider/employees/{id}
DELETE /api/v1/provider/employees/{id}
GET    /api/v1/provider/employees/availability

### Lokalizacje

GET  /api/v1/locations/search?q=
GET  /api/v1/locations/reverse?lat=&lng=
POST /api/v1/locations/validate

### Dostępność

GET  /api/v1/availability/vehicles
GET  /api/v1/availability/employees
POST /api/v1/availability/check

### Wycena

POST /api/v1/pricing/quote

### Rezerwacje

POST  /api/v1/bookings
GET   /api/v1/bookings/{id}
GET   /api/v1/bookings/me
PATCH /api/v1/bookings/{id}/cancel

bookings/me jest dostępny tylko dla zalogowanego klienta. Gość korzysta z bezpiecznego mechanizmu dostępu do swojej rezerwacji.

### Provider

GET   /api/v1/provider/dashboard
GET   /api/v1/provider/bookings
PATCH /api/v1/provider/bookings/{id}/status
POST  /api/v1/provider/bookings/{id}/assign-resources

GET /api/v1/provider/vehicles
GET /api/v1/provider/employees

### Odbiór pojazdu

POST /api/v1/bookings/{id}/handover
GET  /api/v1/bookings/{id}/handover

Endpoint tworzący lub aktualizujący dane odbioru powinien umożliwiać wygenerowanie kodu oraz ustawienie instrukcji odbioru i zwrotu.

Nie dodawaj endpointu potwierdzającego dotarcie pojazdu. Nie jest potrzebny.

Nie implementuj endpointów, które nie są faktycznie wykorzystywane przez frontend.

Dokumentacja API ma być dostępna przez Swagger UI FastAPI.

## 16. Frontend

### Technologie

- React;
- TypeScript;
- Vite;
- Tailwind CSS;
- shadcn/ui;
- React Router;
- TanStack Query;
- React Hook Form;
- Zod;
- Leaflet;
- React Leaflet.

### Proponowana struktura

text
frontend/
├── src/
│   ├── app/
│   ├── components/
│   │   ├── ui/
│   │   ├── layout/
│   │   ├── vehicles/
│   │   ├── booking/
│   │   └── map/
│   ├── features/
│   │   ├── auth/
│   │   ├── vehicles/
│   │   ├── bookings/
│   │   ├── employees/
│   │   ├── provider/
│   │   └── locations/
│   ├── pages/
│   ├── hooks/
│   ├── services/
│   ├── types/
│   └── styles/

Frontend powinien być modularny, a formularze powinny mieć wspólną walidację i czytelną obsługę błędów.

## 17. Docker i uruchamianie

Wymagane:

- Docker;
- Docker Compose;
- PostgreSQL;
- backend FastAPI;
- frontend React.

Przygotuj:

- Dockerfile backendu;
- Dockerfile frontendu;
- docker-compose.yml;
- .env.example;
- migracje;
- seed demonstracyjny.

Projekt powinien uruchamiać się jedną komendą:

docker compose up --build

Po uruchomieniu:

- frontend działa w przeglądarce;
- backend udostępnia API;
- PostgreSQL działa w osobnym kontenerze;
- Swagger UI jest dostępny pod /docs.

## 18. Bezpieczeństwo

Zadbaj o:

- bezpieczne haszowanie haseł;
- kontrolę ról;
- walidację danych;
- ochronę endpointów;
- ochronę danych klientów;
- bezpieczne przechowywanie sekretów;
- brak kluczy API w repozytorium;
- kontrolę dostępu do kodów skrytki;
- walidację danych zwracanych przez zewnętrzne API.

Klient nie może przeglądać cudzych zamówień. Provider może zarządzać zasobami i zamówieniami firmy.

## 19. Zakres MVP — priorytety

### P0 — konieczne

- [ ] React + TypeScript;
- [ ] FastAPI;
- [ ] PostgreSQL;
- [ ] SQLAlchemy;
- [ ] Docker Compose;
- [ ] publiczna strona główna;
- [ ] wybór rodzaju usługi;
- [ ] proces zamawiania etapami;
- [ ] wybór lokalizacji;
- [ ] mapa;
- [ ] obsługa obszaru Trójmiasto + około 30 km;
- [ ] lista pojazdów;
- [ ] jedno zdjęcie na pojazd;
- [ ] parametry pojazdu;
- [ ] sprawdzanie dostępności;
- [ ] zarządzanie pracownikami;
- [ ] sprawdzanie dostępności pracowników;
- [ ] formularz przeprowadzki;
- [ ] dane kontaktowe klienta;
- [ ] zamówienie bez rejestracji;
- [ ] kalkulator ceny;
- [ ] tworzenie rezerwacji;
- [ ] panel Provider;
- [ ] zarządzanie pojazdami;
- [ ] zarządzanie pracownikami;
- [ ] zarządzanie zamówieniami;
- [ ] statusy rezerwacji;
- [ ] generowanie kodu skrytki 6-cyfrowego;
- [ ] możliwość ręcznego przekazania kodu kierowcy do ustawienia na skrytce;
- [ ] instrukcje odbioru i zwrotu;
- [ ] README;
- [ ] testy najważniejszej logiki.

### P1 — jeśli wystarczy czasu

- [ ] opcjonalna rejestracja klienta;
- [ ] powiadomienia e-mail;
- [ ] historia zamówień;
- [ ] lepszy widok kalendarza;
- [ ] zdjęcia stanu pojazdu;
- [ ] testy end-to-end.

### Poza zakresem MVP

Nie implementuj obecnie:

- osobnego panelu administratora;
- marketplace'u wielu firm;
- AI Move Assistant;
- chatbota;
- płatności online;
- recenzji;
- integracji z elektronicznymi zamkami;
- potwierdzania dotarcia pojazdu;
- automatycznego potwierdzania zwrotu pojazdu;
- rozbudowanych statystyk;
- mikroserwisów;
- Kubernetes;
- aplikacji mobilnej.

## 20. Testy i kryteria akceptacji

### Zamawianie

- Klient może wybrać rodzaj usługi.
- Klient może wskazać termin.
- Klient może wskazać lokalizacje.
- Klient widzi dostępne pojazdy.
- Klient może wybrać pojazd.
- Klient może podać szczegóły zlecenia.
- Klient może zamówić jako gość.
- Klient otrzymuje podsumowanie i numer rezerwacji.

### Dostępność

- Ten sam pojazd nie może być przypisany do dwóch nakładających się rezerwacji.
- Ten sam pracownik nie może być przypisany do dwóch nakładających się zleceń.
- System uwzględnia liczbę wymaganych pracowników.
- System uwzględnia czas potrzebny na przemieszczenie pojazdu.
- Dostępność jest sprawdzana ponownie przy tworzeniu rezerwacji.

### Provider

- Provider może dodać pojazd.
- Provider może edytować pojazd.
- Provider może dodać pracownika.
- Provider może ustawić pracownika jako niedostępnego.
- Provider widzi zamówienia.
- Provider może zaakceptować lub odrzucić zamówienie.
- Provider może przypisać pojazd i pracowników.
- Provider może przygotować odbiór pojazdu i wygenerować kod skrytki.

### Skrytka

- System generuje losowy kod 6-cyfrowy.
- Kod jest przechowywany w bezpiecznej postaci.
- Kod jest dostępny wyłącznie dla uprawnionych osób.
- Provider może przekazać kod kierowcy.
- Kierowca ręcznie ustawia kod na fizycznej skrytce w samochodzie.
- Klient otrzymuje kod i instrukcje we właściwym momencie.
- System nie wymaga potwierdzania dotarcia pojazdu ani jego zwrotu.

### Docker

- Projekt uruchamia się na czystym środowisku.
- Migracje wykonują się poprawnie.
- Dane demonstracyjne są dostępne.
- Frontend komunikuje się z backendem.

## 21. README i GitHub

README powinien zawierać:

- opis projektu;
- problem, który rozwiązuje;
- najważniejsze funkcjonalności;
- stack technologiczny;
- architekturę;
- instrukcję uruchomienia;
- konfigurację środowiska;
- dane demonstracyjne;
- opis API;
- informacje o integracji map;
- screenshoty;
- demo GIF lub MP4;
- znane ograniczenia MVP;
- informacje o wykorzystaniu AI podczas tworzenia kodu.

Repozytorium powinno być publiczne. Dodawaj sensowne commity przedstawiające etapy rozwoju.

## 22. Sposób pracy AI

Nie generuj całej aplikacji od razu.

Najpierw przeanalizuj specyfikację i przygotuj:

1. Ocenę wykonalności MVP.
2. Propozycję uproszczeń.
3. Architekturę.
4. Model bazy danych.
5. Strukturę katalogów.
6. Listę zależności.
7. Kontrakty API.
8. Plan implementacji.
9. Najważniejsze ryzyka.

Zwróć szczególną uwagę na logikę dostępności pojazdów i pracowników. To kluczowa część aplikacji.

Następnie implementuj etapami:

1. Konfiguracja projektu i Docker.
2. Baza danych i modele.
3. Backend i API.
4. Frontend i podstawowe UI.
5. Pojazdy i pracownicy.
6. Mapa i lokalizacje.
7. Dostępność i rezerwacje.
8. Panel Provider.
9. Kod skrytki i instrukcje odbioru.
10. Testy, poprawki i README.

Po każdym etapie:

- przedstaw zmiany;
- wyjaśnij, jakie pliki powstały;
- uruchom lub zaproponuj testy;
- sprawdź, czy poprzednie funkcje nadal działają.

Nie dodawaj funkcji spoza specyfikacji bez wcześniejszego uzasadnienia.

Jeżeli wymaganie jest niejasne, zapytaj mnie przed implementacją.

*Główny cel: stworzyć małe, dopracowane i działające MVP MoveIt, w którym klient może przejść cały proces zamówienia, a firma może zarządzać ograniczoną flotą i zespołem pracowników.*