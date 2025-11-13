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
    settings: "Settings",
    threeDPrinting: "3D Printing",
    guestbook: "Guestbook",
    certificates: "Certificates",

    // About me
    aboutMeIntro: "Hey there! Welcome to my portfolio.",
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
    AboutMeBooks : 
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
    sp: "Snackbar Podcast",
    spDescription: "A podcast made for Dutch lessons.",
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
    goToProject: "Go to Project",
    goToRepository: "Go to Repository",

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

    // Easter egg
    oldVideo: "Old Video",
    easterEgg: "Easter Egg",

    // Guestbook
    signGuestbook: "Sign Guestbook",
    guestbookName: "Your Name",
    guestbookMessage: "Your Message",
    guestbookSubmit: "Submit",
    guestbookSuccess: "Thank you for signing the guestbook!",
    guestbookError: "Error submitting your message. Please try again.",
    guestbookInfo:
      "Welcome to my guestbook! Leave a message for future visitors.",
    noEntries: "No entries yet. Be the first to sign!",
  },

  nl: {
    // App names
    aboutMe: "Over Mij",
    contact: "Contact",
    projects: "Projecten",
    socials: "Socials",
    artGallery: "Kunstgalerij",
    miniGame: "Mini Spel",
    settings: "Instellingen",
    threeDPrinting: "3D Printen",
    guestbook: "Gastenboek",
    certificates: "Certificaten",
    // About me
    aboutMeIntro: "Hey daar! Welkom op mijn portfolio.",
    aboutMeQuestion: "Waarmee kan ik je helpen?",
    aboutMeNerd: "Zeker! Ik ben wat veel mensen een nerd zouden noemen.",
    aboutMeGadgets: "Ik hou van gadgets en snufjes.",
    aboutMeVinyls: "Ik luister graag naar vinylplaten en speel videogames.",
    aboutMeFavoriteVinyl:
      "Mijn favoriete vinyl is de originele soundtrack van de film 'Spiderman into the Spider-Verse'.",
    aboutMeFavoriteGames: "Ik heb niet één favoriete game, maar twee.",
    aboutMeGames:
      "Bloodborne en The Binding of Isaac hebben een speciale plek in mijn hart.",
    aboutMeBooks : 
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
    sp: "Snackbar Podcast",
    spDescription: "Een podcast voor Nederlands.",
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
    goToProject: "Ga naar Project",
    goToRepository: "Ga naar Repository",

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

    // Easter egg
    oldVideo: "Oude Video",
    easterEgg: "Easter Egg",

    // Guestbook
    signGuestbook: "Gastenboek Tekenen",
    guestbookName: "Jouw Naam",
    guestbookMessage: "Jouw Bericht",
    guestbookSubmit: "Versturen",
    guestbookSuccess: "Bedankt voor het tekenen van het gastenboek!",
    guestbookError:
      "Fout bij het versturen van je bericht. Probeer het opnieuw.",
    guestbookInfo:
      "Welkom bij mijn gastenboek! Laat een bericht achter voor toekomstige bezoekers.",
    noEntries: "Nog geen berichten. Wees de eerste om te tekenen!",
  },
};

const i18n = createI18n({
  legacy: false, // Use Composition API mode
  locale: 'en', // Default language
  fallbackLocale: 'en', // Fallback language
  messages,
});

export default i18n;