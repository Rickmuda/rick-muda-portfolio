import { createI18n } from 'vue-i18n';

const messages = {
  en: {
    // App names
    aboutMe: "About Me",
    contact: "Contact",
    projects: "Projects",
    socials: "Socials",
    artGallery: "Art Gallery",
    miniGame: "Mini Game",
    minigames: "Minigames",
    solitaire: "Solitaire",
    minesweeper: "Minesweeper",
    mineEasy: "Easy",
    mineMedium: "Medium",
    mineHard: "Hard",
    mineNewGame: "New Game",
    mineWin: "You cleared the board!",
    mineLose: "Boom! You hit a mine.",
    mineFlagged: "Mines remaining",
    mineBest: "Best",
    flappyRick: "Flappy Rick",
    flappyStart: "Start",
    flappyRestart: "Play again",
    flappyGameOver: "Game Over",
    flappyScore: "Score",
    flappyBest: "Best",
    flappyInstructions: "Click, tap or press Space to flap. Avoid the pipes!",
    settings: "Settings",
    threeDPrinting: "3D Printing",
    certificates: "Certificates",
    vinylCollection: "Vinyl Collection",
    vinylDisclaimer: "This is just a showcase of my real vinyl collection, no music is actually played.",
    skillTree: "Skill Tree",
    downloads: "Downloads",
    mudaDigitaal: "MudaDigitaal",
    paint: "Paint",

    // Paint app
    enableSounds: "Enable sound effects",
    achievements: "Achievements",
    achievementUnlocked: "Achievement unlocked",
    achievementLocked: "Locked - keep exploring to unlock.",
    achFirstBootTitle: "First Boot",                 achFirstBootDesc: "Open your first window.",
    achSolitaireWonTitle: "Cleared the Table",       achSolitaireWonDesc: "Win a game of Solitaire.",
    achPaintStrokeTitle: "Picasso",                  achPaintStrokeDesc: "Draw your first stroke in Paint.",
    achPaintBucketTitle: "Splash",                   achPaintBucketDesc: "Use the fill bucket.",
    achPaintClearTitle: "Fresh Start",               achPaintClearDesc: "Clear the Paint canvas.",
    achFlappyScore10Title: "Air Time",               achFlappyScore10Desc: "Score 10 or more in Flappy Rick.",
    achTourGuideTitle: "Tour Guide",                 achTourGuideDesc: "Open every window in the OS.",
    achHackerTitle: "Hacker",                        achHackerDesc: "Discover the secret code.",
    achNightOwlTitle: "Night Owl",                   achNightOwlDesc: "Toggle dark mode.",
    achBilingualTitle: "Bilingual",                  achBilingualDesc: "Switch the language.",
    achMinesweeperTitle: "Bomb Squad",               achMinesweeperDesc: "Win a game of Minesweeper.",
    achDecoratorTitle: "Decorator",                  achDecoratorDesc: "Change the wallpaper.",
    achArtCollectorTitle: "Art Collector",           achArtCollectorDesc: "View art in fullscreen.",
    paintBrush: "Brush",
    paintBucket: "Fill",
    paintEraser: "Eraser",
    paintUndo: "Undo",
    paintClear: "Clear",
    paintSave: "Save PNG",
    paintCancel: "Cancel",
    paintClearConfirm: "Clear the whole canvas?",

    // MudaDigitaal terminal
    mudaWelcome: "MudaDigitaal terminal v1.0\nType 'help' to get started.",
    mudaHelp: "Available commands:\n  help      - show this list\n  about     - what MudaDigitaal does\n  services  - what we offer\n  contact   - get in touch\n  open      - open mudadigitaal.nl\n  clear     - clear the screen",
    mudaAbout: "MudaDigitaal - UX-First Webdesign Bureau.\nWe design and build fast, mobile-ready websites.\nYou see the design before you pay. Fixed pricing, ~3-6 weeks.",
    mudaServices: "What we offer:\n  - UX Design\n  - Conversion optimization\n  - Performance optimization\n  - Redesign\n  - Maintenance & support",
    mudaContactLine: "Email: {email}",
    mudaOpening: "Opening mudadigitaal.nl ...",
    mudaUnknown: "command not found: {cmd} - type 'help'",

    // Downloads
    download: "Download",
    comingSoon: "Coming soon",
    protected: "Protected",
    downloadEnterPassword: "Enter password",
    unlock: "Unlock",
    desktopOnly: "Only available on desktop",
    downloadWrongPassword: "Wrong password.",
    downloadError: "Something went wrong. Please try again.",
    dlPhotoTitle: "Portfolio opdracht: Fotografie",
    dlPhotoDesc: "A photography portfolio assignment I made.",

    // About me
    aboutMeIntro: "Hey there! Welcome to my portfolio.",
    greeting: "Hey there! Welcome to my portfolio. Feel free to ask me anything!",
    aboutMeQuestion: "What can I help you with?",
    aboutMeNerd: "Sure! I'm what many people would call a nerd.",
    aboutMeGadgets: "I love gadgets and tech.",
    aboutMeVinyls:
      "I enjoy listening to vinyl records and playing video games.",
    aboutMeFavoriteVinyl:
      "My favorite vinyl is the original soundtrack of the movie 'Spiderman into the Spider-Verse'.",
    aboutMeFavoriteGames: "I don't have one favorite game, but two.",
    aboutMeGames:
      "Bloodborne and The Binding of Isaac hold a special place in my heart.",
    aboutMeBooks: 
      "I've also picked up reading in the last couple of weeks and really enjoyed the king in yellow from Robert W. Chambers",
    aboutMeHelp: "What else can I help you with?",
    projectsIntro:
      "The projects I create in my free time are usually ideas that come to me spontaneously.",
    projectsGithub:
      "If you're curious about my projects, you can check out a few in the projects window or on my GitHub.",
    projectsHelp: "What else can I help you with?",
    skillsIntro: "I specialize in front-end web development.",
    skillsLanguages:
      "I work with all kinds of front-end languages and frameworks.",
    skillsBackEnd:
      "I also have experience with back-end technologies, but I prefer working with front-end so I can let my creativity shine.",
    skillsHelp: "What else can I help you with?",
    tellMeAboutYourself: "Tell me about yourself.",
    showMeYourProjects: "Show me your projects.",
    whatAreYourSkills: "What are your skills?",
    goBack: "Go back.",
    canISeeYourCV: "Can I see your CV?",
    cvSure: "Of course! Here you go - feel free to download it.",
    whatAreYourSocials: "What are your socials?",
    socialsIntro: "Sure! Here are my social media links - feel free to connect with me!",
    showMeYourCertificates: "Show me your certificates.",
    certificatesIntro: "Here are some fun certificates I've collected! Click to expand.",
    funFacts: "Fun Facts",
    funFact1: "Version 1.0 of this portfolio was built in just one weekend.",
    funFact2: "",
    funFact3: "I own over 30 vinyl records and counting.",
    funFact4: "",
    funFact5: "",

    // Settings
    language: "Language",
    enableDarkMode: "Enable Dark Mode",
    selectLanguage: "Select Language",

    // Projects
    uwp: "Unnamed Weather App",
    uwpDescription:
      "A small project I had to do for school where we had to make use of an API.",
    aw: "Annoying Webpage",
    awDescription:
      "This was the second project of my first year where I had to work in pairs and make a webpage as annoying as possible.",
    wam: "Whack a Mom",
    wamDescription:
      "For the third project of my first year I had to make a game using HTML, CSS and JS.",
    gl: "Gym List",
    glDescription:
      "This project I made was for myself to keep track of my gym progress.",
    op: "One Pager",
    opDescription:
      "For the first project of my first year, I had to recreate a one-page website using HTML and CSS.",
    eq: "English Quiz",
    eqDescription: "A project where I created an English quiz application.",
    sp: "Snackbar",
    spDescription: "A creative video project showcasing multimedia production.",
    sf: "Spiderverse Forum",
    sfDescription: "A forum website inspired by the Spiderverse movie.",
    tdl: "To-Do List",
    tdlDescription: "A simple to-do list application to manage tasks.",
    ul: "Undertale Laravel",
    ulDescription: "A Laravel-based project inspired by the game Undertale.",
    us: "Undertale Sudoku",
    usDescription: "A Sudoku game with an Undertale theme.",
    ws: "Webshop",
    wsDescription: "An e-commerce website project.",
    dnm: "Dungeons and Music",
    dnmDescription: "A project I made in a day to learn more about Vue.js.",
    lvt: "Long Video Theater",
    lvtDescription:
      "A project made with Remix and prisma, this was a great way to learn more about these frameworks.",
    syp: "2nd year portfolio",
    sypDescription: "The portfolio I made for my second year at school.",
    fyp: "First year portfolio",
    fypDescription: "My first portfolio I made for my first year at school.",
    qt: "Quiet Turn",
    qtDescription: "A magic the gathering game tracker for neurodivergent people to make the game more accessible.",
    lh: "LunarHome",
    lhDescription: "A personal streaming service for the DVDs I collect.",
    goToProject: "Go to Project",

    // Start menu
    startMenu: "Start Menu",
    startMenuIntro:
      "Rick Ambergen production presents a Rick Ambergen portfolio!",
    currentVersion: "Current version",

    // Contact
    email: "Email",
    fullName: "Full Name",
    message: "Message",
    sendEmail: "Send e-mail",
    enterEmail: "Enter your email",
    enterFullName: "Enter your full name",
    enterMessage: "Enter your message",
    fillAllFields: "Please fill out all fields.",
    messageSent: "Message sent successfully!",
    messageFailed: "Failed to send message. Please try again.",
    errorOccurred: "An error occurred. Please try again.",

    // Mini game
    clickTheRick: "Click the Rick",
    score: "Score",
    upgrades: "Upgrades",
    cost: "Cost",
    nextMultiplier: "Next Multiplier",
    autoClicks: "Auto Clicks",
    sec: "sec",
    buy: "Buy",
    doubleClicks: "Double Clicks",
    autoClicker: "Auto Clicker",

    // Languages
    english: "English",
    dutch: "Dutch",
    german: "German",

    // Wallpaper
    selectWallpaper: "Wallpaper",
    wpDefault: "Room",
    wpAurora: "Aurora",
    wpSunset: "Sunset",
    wpOcean: "Ocean",
    wpForest: "Forest",
    wpMidnight: "Midnight",

    // Art gallery
    viewFullscreen: "View fullscreen",
    closeFullscreen: "Close fullscreen",

    // Easter egg
    oldVideo: "Old Video",
    easterEgg: "Easter Egg",
  },

  nl: {
    // App names
    aboutMe: "Over Mij",
    contact: "Contact",
    projects: "Projecten",
    socials: "Socials",
    artGallery: "Kunstgalerij",
    miniGame: "Mini Spel",
    minigames: "Minigames",
    solitaire: "Solitaire",
    minesweeper: "Mijnenveger",
    mineEasy: "Makkelijk",
    mineMedium: "Gemiddeld",
    mineHard: "Moeilijk",
    mineNewGame: "Nieuw spel",
    mineWin: "Je hebt het bord leeggespeeld!",
    mineLose: "Boem! Je raakte een mijn.",
    mineFlagged: "Resterende mijnen",
    mineBest: "Beste",
    flappyRick: "Flappy Rick",
    flappyStart: "Start",
    flappyRestart: "Opnieuw spelen",
    flappyGameOver: "Game Over",
    flappyScore: "Score",
    flappyBest: "Beste",
    flappyInstructions: "Klik, tik of druk op spatie om te fladderen. Ontwijk de buizen!",
    settings: "Instellingen",
    threeDPrinting: "3D Printen",
    certificates: "Certificaten",
    vinylCollection: "Vinyl Collectie",
    vinylDisclaimer: "Dit is enkel een showcase van mijn echte platencollectie, er wordt geen muziek afgespeeld.",
    skillTree: "Vaardighedenboom",
    downloads: "Downloads",
    mudaDigitaal: "MudaDigitaal",
    paint: "Tekenen",

    // Paint app
    enableSounds: "Geluidseffecten inschakelen",
    achievements: "Prestaties",
    achievementUnlocked: "Prestatie behaald",
    achievementLocked: "Vergrendeld - blijf ontdekken om te ontgrendelen.",
    achFirstBootTitle: "Eerste opstart",             achFirstBootDesc: "Open je eerste venster.",
    achSolitaireWonTitle: "Tafel leeg",              achSolitaireWonDesc: "Win een potje Patience.",
    achPaintStrokeTitle: "Picasso",                  achPaintStrokeDesc: "Maak je eerste streek in Tekenen.",
    achPaintBucketTitle: "Plons",                    achPaintBucketDesc: "Gebruik de vulemmer.",
    achPaintClearTitle: "Schone lei",                achPaintClearDesc: "Maak het Tekenen-canvas leeg.",
    achFlappyScore10Title: "Air Time",               achFlappyScore10Desc: "Scoor 10 of meer in Flappy Rick.",
    achTourGuideTitle: "Rondleider",                 achTourGuideDesc: "Open elk venster in de OS.",
    achHackerTitle: "Hacker",                        achHackerDesc: "Ontdek de geheime code.",
    achNightOwlTitle: "Nachtbraker",                 achNightOwlDesc: "Zet donkere modus aan.",
    achBilingualTitle: "Tweetalig",                  achBilingualDesc: "Verander de taal.",
    achMinesweeperTitle: "Mijnopruimer",             achMinesweeperDesc: "Win een potje Mijnenveger.",
    achDecoratorTitle: "Decorateur",                 achDecoratorDesc: "Verander de achtergrond.",
    achArtCollectorTitle: "Kunstverzamelaar",        achArtCollectorDesc: "Bekijk kunst op volledig scherm.",
    paintBrush: "Penseel",
    paintBucket: "Vullen",
    paintEraser: "Gum",
    paintUndo: "Ongedaan maken",
    paintClear: "Wissen",
    paintSave: "Opslaan",
    paintCancel: "Annuleren",
    paintClearConfirm: "Hele canvas wissen?",

    // MudaDigitaal terminal
    mudaWelcome: "MudaDigitaal terminal v1.0\nTyp 'help' om te beginnen.",
    mudaHelp: "Beschikbare commando's:\n  help      - toon deze lijst\n  about     - wat MudaDigitaal doet\n  services  - wat we aanbieden\n  contact   - neem contact op\n  open      - open mudadigitaal.nl\n  clear     - maak het scherm leeg",
    mudaAbout: "MudaDigitaal - UX-First Webdesign Bureau.\nWij ontwerpen en bouwen snelle, mobiel-klare websites.\nJe ziet het ontwerp voordat je betaalt. Vaste prijs, ~3-6 weken.",
    mudaServices: "Wat we aanbieden:\n  - UX Design\n  - Conversie-optimalisatie\n  - Performance-optimalisatie\n  - Redesign\n  - Onderhoud & support",
    mudaContactLine: "E-mail: {email}",
    mudaOpening: "mudadigitaal.nl wordt geopend ...",
    mudaUnknown: "commando niet gevonden: {cmd} - typ 'help'",

    // Downloads
    download: "Downloaden",
    comingSoon: "Binnenkort",
    protected: "Beveiligd",
    downloadEnterPassword: "Voer wachtwoord in",
    unlock: "Ontgrendelen",
    desktopOnly: "Alleen beschikbaar op desktop",
    downloadWrongPassword: "Verkeerd wachtwoord.",
    downloadError: "Er ging iets mis. Probeer het opnieuw.",
    dlPhotoTitle: "Portfolio opdracht: Fotografie",
    dlPhotoDesc: "Een portfolio-opdracht over fotografie die ik gemaakt heb.",

    // About me
    aboutMeIntro: "Hey daar! Welkom op mijn portfolio.",
    greeting: "Hoi daar! Welkom op mijn portfolio. Vraag me gerust wat je wilt weten!",
    aboutMeQuestion: "Waarmee kan ik je helpen?",
    aboutMeNerd: "Zeker! Ik ben wat veel mensen een nerd zouden noemen.",
    aboutMeGadgets: "Ik hou van gadgets en snufjes.",
    aboutMeVinyls: "Ik luister graag naar vinylplaten en speel videogames.",
    aboutMeFavoriteVinyl:
      "Mijn favoriete vinyl is de originele soundtrack van de film 'Spiderman into the Spider-Verse'.",
    aboutMeFavoriteGames: "Ik heb niet één favoriete game, maar twee.",
    aboutMeGames:
      "Bloodborne en The Binding of Isaac hebben een speciale plek in mijn hart.",
    aboutMeBooks: 
      "Ik heb sinds kort ook lezen op gepakt en heb enorm genoten van 'The king in yellow' van Robert W. Chambers",
    aboutMeHelp: "Waarmee kan ik je verder helpen?",
    projectsIntro:
      "De projecten die ik in mijn vrije tijd maak, zijn meestal ideeën die ik spontaan krijg.",
    projectsGithub:
      "Als je nieuwsgierig bent naar mijn projecten, kun je er een paar bekijken in het projectvenster of op mijn GitHub.",
    projectsHelp: "Waarmee kan ik je verder helpen?",
    skillsIntro: "Ik ben gespecialiseerd in front-end webontwikkeling.",
    skillsLanguages: "Ik werk met allerlei front-end talen en frameworks.",
    skillsBackEnd:
      "Ik heb ook ervaring met back-end technologieën, maar ik werk liever met front-end zodat ik mijn creativiteit kan laten zien.",
    skillsHelp: "Waarmee kan ik je verder helpen?",
    tellMeAboutYourself: "Vertel me over jezelf.",
    showMeYourProjects: "Laat me je projecten zien.",
    whatAreYourSkills: "Wat zijn je vaardigheden?",
    goBack: "Ga terug.",
    canISeeYourCV: "Kan ik je CV zien?",
    cvSure: "Natuurlijk! Hier is het - download het gerust.",
    whatAreYourSocials: "Wat zijn je socials?",
    socialsIntro: "Natuurlijk! Hier zijn mijn social media links - voel je vrij om contact te maken!",
    showMeYourCertificates: "Laat me je certificaten zien.",
    certificatesIntro: "Hier zijn een paar leuke certificaten die ik heb verzameld! Klik om te vergroten.",
    funFacts: "Leuke Weetjes",
    funFact1: "Ik heb ooit een volledige portfolio-website in één weekend gebouwd.",
    funFact2: "Mijn eerste regel code was in Scratch - ik maakte een dansende kat.",
    funFact3: "Ik heb meer dan 30 vinylplaten en het worden er steeds meer.",
    funFact4: "Bloodborne is de enige game die ik twee keer heb geplatinumd.",
    funFact5: "Ik kan elke Spider-Man filmsoundtrack uit mijn hoofd opnoemen.",

    // Settings
    enableDarkMode: "Schakel Donkere Modus In",
    selectLanguage: "Selecteer Taal",
    language: "Taal",

    // Projects
    uwp: "Onbenoemde Weer App",
    uwpDescription:
      "Een klein project dat ik moest doen voor school waarbij we gebruik moesten maken van een API.",
    aw: "Vervelende Webpagina",
    awDescription:
      "Dit was het tweede project van mijn eerste jaar waarin ik in een duo een zo irritant mogelijke webpagina moest maken.",
    wam: "Mep een Moeder",
    wamDescription:
      "Voor het derde project van mijn eerste jaar moest ik een spel maken met HTML, CSS en JS.",
    gl: "Sportschool Lijst",
    glDescription:
      "Dit project heb ik gemaakt om mijn sportschoolvoortgang bij te houden.",
    op: "Enkele Pagina",
    opDescription:
      "Voor het eerste project van mijn eerste jaar moest ik een one-pager website namaken met HTML en CSS.",
    eq: "Engelse Quiz",
    eqDescription:
      "Een project waarin ik een Engelse quiz-applicatie heb gemaakt.",
    sp: "Snackbar",
    spDescription: "Een creatief videoproject dat multimediaproductie toont.",
    sf: "Spiderverse Forum",
    sfDescription: "Een forumwebsite geïnspireerd door de Spiderverse-film.",
    tdl: "Takenlijst",
    tdlDescription: "Een eenvoudige takenlijst-applicatie om taken te beheren.",
    ul: "Undertale Laravel",
    ulDescription: "Een Laravel-project geïnspireerd door de game Undertale.",
    us: "Undertale Sudoku",
    usDescription: "Een Sudoku-spel met een Undertale-thema.",
    ws: "Webwinkel",
    wsDescription: "Een e-commerce websiteproject.",
    dnm: "Kerkers en Muziek",
    dnmDescription:
      "Een project dat ik in een dag heb gemaakt om meer te leren over Vue.js.",
    lvt: "Lang video theater",
    lvtDescription:
      "Een project gemaakt met Remix en prima om meer te leren over deze frameworks.",
    syp: "2e jaar portfolio",
    sypDescription:
      "Het portfolio dat ik heb gemaakt voor mijn tweede jaar op school.",
    fyp: "1e jaar portfolio",
    fypDescription:
      "Mijn allereerste portfolio dat ik heb gemaakt voor mijn eerste jaar op school.",
    qt: "Quiet Turn",
    qtDescription: "Een magic the gathering game tracker voor neurodivergente mensen om het spel toegankelijker te maken.",
    lh: "LunarHome",
    lhDescription: "Een persoonlijke streaming service voor de dvd's die ik verzamel.",
    goToProject: "Ga naar Project",

    // Start menu
    startMenu: "Start Menu",
    startMenuIntro:
      "Rick Ambergen productie presenteert een Rick Ambergen portfolio!",
    currentVersion: "Huidige versie",

    // Contact
    email: "E-mail",
    fullName: "Volledige Naam",
    message: "Bericht",
    sendEmail: "E-mail verzenden",
    enterEmail: "Voer uw e-mailadres in",
    enterFullName: "Voer uw volledige naam in",
    enterMessage: "Voer uw bericht in",
    fillAllFields: "Vul alle velden in.",
    messageSent: "Bericht succesvol verzonden!",
    messageFailed: "Bericht verzenden mislukt. Probeer het opnieuw.",
    errorOccurred: "Er is een fout opgetreden. Probeer het opnieuw.",

    // Mini game
    clickTheRick: "Klik de Rick",
    score: "Score",
    upgrades: "Upgrades",
    cost: "Kosten",
    nextMultiplier: "Volgende Vermenigvuldiger",
    autoClicks: "Automatische Klikken",
    sec: "seconde",
    buy: "Kopen",
    doubleClicks: "Dubbele Klikken",
    autoClicker: "Automatisch Klikken",

    // Languages
    english: "Engels",
    dutch: "Nederlands",
    german: "Duits",

    // Wallpaper
    selectWallpaper: "Achtergrond",
    wpDefault: "Kamer",
    wpAurora: "Aurora",
    wpSunset: "Zonsondergang",
    wpOcean: "Oceaan",
    wpForest: "Bos",
    wpMidnight: "Middernacht",

    // Art gallery
    viewFullscreen: "Volledig scherm",
    closeFullscreen: "Sluit volledig scherm",

    // Easter egg
    oldVideo: "Oude Video",
    easterEgg: "Easter Egg",
  },
};

const i18n = createI18n({
  legacy: false, // Use Composition API mode
  locale: 'en', // Default language
  fallbackLocale: 'en', // Fallback language
  messages,
});

export default i18n;