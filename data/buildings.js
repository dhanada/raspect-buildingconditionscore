/**
 * RaSpect Inspectica™ — Sample asset dataset
 * Used to populate the BuildingConditionScore tool with demo properties.
 * Each preset maps to a locally-vendored illustration (assets/img/*.svg).
 */
window.RaspectBuildings = [
  {
    title: "Hong Kong Commercial Tower",
    address: "100 Queen's Road Central, HK",
    type: "Commercial High-Rise",
    year: 1988,
    floors: 45,
    facadeArea: "28,400",
    image: "assets/img/hk-tower.svg",
    googleMapsUrl: "https://maps.google.com/?cid=14995448563435482337",
    coordinates: "22.2831° N, 114.1557° E",
    mapRating: 4.2,
    reviewsCount: 312,
    comments: [
      { author: "Marcus K.", rating: 3, date: "2 months ago", topic: "Facade Maintenance", helpful: 14, text: "Great central location, but noticed protective netting on lower floors recently due to minor exterior tile spalling concerns." },
      { author: "Elaine Wong", rating: 2, date: "4 months ago", topic: "Window Seals & Drafts", helpful: 28, text: "Our 28th floor office gets noticeable window drafts and minor water seepage along mullions during severe typhoons." },
      { author: "David T.", rating: 4, date: "6 months ago", topic: "Thermal Comfort", helpful: 9, text: "Sleek glass curtain wall, though east-facing offices get very warm in summer afternoons, indicating older window tint insulation." }
    ]
  },
  {
    title: "New York Residential Skyscraper",
    address: "350 5th Ave, New York, NY",
    type: "Mixed-Use Skyscraper",
    year: 1974,
    floors: 58,
    facadeArea: "42,100",
    image: "assets/img/ny-skyscraper.svg",
    googleMapsUrl: "https://maps.google.com/?cid=3869101963558127999",
    coordinates: "40.7484° N, 73.9857° W",
    mapRating: 4.7,
    reviewsCount: 1420,
    comments: [
      { author: "Sarah B.", rating: 3, date: "1 month ago", topic: "Exterior Cladding", helpful: 42, text: "Iconic landmark, but frequent facade scaffolding setups over the sidewalk suggest ongoing exterior stone maintenance." },
      { author: "Michael R.", rating: 4, date: "3 months ago", topic: "HVAC & Energy", helpful: 18, text: "Solid structure, but window frames are showing age with slight moisture fogging between double panes." }
    ]
  },
  {
    title: "London Financial Plaza",
    address: "1 Canada Square, London, UK",
    type: "Commercial Office",
    year: 1991,
    floors: 50,
    facadeArea: "31,200",
    image: "assets/img/london-plaza.svg",
    googleMapsUrl: "https://maps.google.com/?cid=11983060474748277005",
    coordinates: "51.5050° N, 0.0209° W",
    mapRating: 4.5,
    reviewsCount: 880,
    comments: [
      { author: "James P.", rating: 4, date: "3 weeks ago", topic: "Weather Resistance", helpful: 11, text: "Prone to heavy wind exposure in Docklands. Cladding held up well, but periodic maintenance booms are active on top floors." },
      { author: "Chloe M.", rating: 3, date: "5 months ago", topic: "Gasket Leaks", helpful: 15, text: "Noticed occasional rain drips in perimeter window bays during rainstorms on upper levels." }
    ]
  },
  {
    title: "Sydney Harbor Complex",
    address: "77 Market St, Sydney, NSW",
    type: "Residential Complex",
    year: 1982,
    floors: 32,
    facadeArea: "18,700",
    image: "assets/img/sydney-harbor.svg",
    googleMapsUrl: "https://maps.google.com/?cid=5863708284225894865",
    coordinates: "33.8708° S, 151.2082° E",
    mapRating: 4.1,
    reviewsCount: 240,
    comments: [
      { author: "Liam H.", rating: 2, date: "2 months ago", topic: "Salt Corrosion", helpful: 31, text: "Near harbor environment means balcony concrete railings show noticeable salt spray wear and hairline cracking." },
      { author: "Hannah K.", rating: 4, date: "4 months ago", topic: "Window Seals", helpful: 7, text: "Great views, but slider window gaskets need replacement as noise and dust enter during windy days." }
    ]
  }
];
