// Default About Me chat, bundled with the site. AboutMe.vue reads it through
// src/contentStore.js, which the admin panel can override.
//
// Texts are i18n keys here (labelKey / key / greetingKey); the admin panel can
// type its own { en, nl } text instead. A question's `attachment` adds an
// extra bubble after the answers: the CV download, the social icons or the
// certificates.

const message = (key) => ({ key, text: {} });

export const about = {
  avatar: "bundled:about/self-image-1.webp",
  status: { en: "Rick · Online" },
  greetingKey: "greeting",
  greeting: {},
  questions: [
    {
      id: "about",
      labelKey: "tellMeAboutYourself",
      messages: ["aboutMeNerd", "aboutMeGadgets", "aboutMeVinyls", "aboutMeGames", "aboutMeBooks"].map(message),
      attachment: "none",
    },
    { id: "projects", labelKey: "showMeYourProjects", messages: ["projectsIntro", "projectsGithub"].map(message), attachment: "none" },
    { id: "skills", labelKey: "whatAreYourSkills", messages: ["skillsIntro", "skillsLanguages", "skillsBackEnd"].map(message), attachment: "none" },
    { id: "cv", labelKey: "canISeeYourCV", messages: [message("cvSure")], attachment: "cv" },
    { id: "socials", labelKey: "whatAreYourSocials", messages: [message("socialsIntro")], attachment: "socials" },
    { id: "certificates", labelKey: "showMeYourCertificates", messages: [message("certificatesIntro")], attachment: "certificates" },
  ],
  // The CV used to be a hand-uploaded /cv/ file; upload it from the admin panel
  // instead so it survives deploys.
  cv: { file: "", name: "Rick_Ambergen_CV.pdf" },
  socials: [
    { id: "twitter", icon: "twitter", label: "Twitter", url: "https://twitter.com/Rick_rickerd" },
    { id: "instagram", icon: "instagram", label: "Instagram", url: "https://www.instagram.com/rick_muda/" },
    { id: "linkedin", icon: "linkedin", label: "LinkedIn", url: "https://www.linkedin.com/in/rick-ambergen-30b73a29a/" },
    { id: "github", icon: "github", label: "GitHub", url: "https://github.com/rickmuda" },
    { id: "youtube", icon: "youtube", label: "YouTube", url: "https://www.youtube.com/channel/UCHSimkVEkXs0Xp1U4nInA0w" },
    { id: "tiktok", icon: "tiktok", label: "TikTok", url: "https://www.tiktok.com/@rick_muda" },
    { id: "spotify", icon: "spotify", label: "Spotify", url: "https://open.spotify.com/user/rick_rickerd_rickman" },
    { id: "steam", icon: "steam", label: "Steam", url: "https://steamcommunity.com/id/rick_muda/" },
  ],
  certificates: [
    { id: "rattickling", title: "Rat Tickling", image: "bundled:about/rattickling.webp" },
    { id: "dudeism", title: "Church of Dudeism", image: "bundled:about/dudeism.webp" },
  ],
};

// Brand icons a social link can use (all registered in src/main.js); "link"
// is a generic solid chain icon for anything else.
export const socialIcons = [
  "twitter", "x-twitter", "bluesky", "instagram", "facebook", "linkedin", "github",
  "youtube", "twitch", "tiktok", "discord", "reddit", "spotify", "soundcloud",
  "steam", "behance", "dribbble", "link",
];
