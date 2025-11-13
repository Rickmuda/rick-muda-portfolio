<template>
  <div class="about-me-container">
    <!-- Speaker Images -->
    <div class="speaker-images">
      <img
        v-if="currentSpeaker === 'me'"
        src="/src/assets/img/self-image-1.webp"
        alt="Me"
        class="speaker-image"
      />
      <img
        v-if="currentSpeaker === 'me2'"
        src="/src/assets/img/self-image-2.webp"
        alt="Me (Alternate)"
        class="speaker-image"
      />
    </div>

    <!-- Dialogue Text -->
    <div class="dialogue-box">
      <p>{{ displayedText }}</p>
    </div>

    <!-- Dialogue Options -->
    <div class="choices" v-show="currentChoices.length">
      <button
        v-for="(choice, index) in currentChoices"
        :key="index"
        @click="makeChoice(choice)"
        class="choice-button"
      >
        {{ choice.text }}
      </button>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      story: {
        start: {
          text: [
            { speaker: "me", text: this.$t("aboutMeIntro") },
            { speaker: "me2", text: this.$t("aboutMeQuestion") },
          ],
          choices: [
            { text: this.$t("tellMeAboutYourself"), next: "aboutMe" },
            { text: this.$t("showMeYourProjects"), next: "projects" },
            { text: this.$t("whatAreYourSkills"), next: "skills" },
          ],
        },
        aboutMe: {
          text: [
            { speaker: "me", text: this.$t("aboutMeNerd") },
            { speaker: "me", text: this.$t("aboutMeGadgets") },
            { speaker: "me", text: this.$t("aboutMeVinyls") },
            { speaker: "me", text: this.$t("aboutMeFavoriteVinyl") },
            { speaker: "me", text: this.$t("aboutMeFavoriteGames") },
            { speaker: "me", text: this.$t("aboutMeGames") },
            { speaker: "me", text: this.$t("aboutMeBooks") },
            { speaker: "me", text: this.$t("aboutMeHelp") },
          ],
          choices: [
            { text: this.$t("whatAreYourSkills"), next: "skills" },
            { text: this.$t("showMeYourProjects"), next: "projects" },
            { text: this.$t("goBack"), next: "start" },
          ],
        },
        projects: {
          text: [
            { speaker: "me", text: this.$t("projectsIntro") },
            { speaker: "me2", text: this.$t("projectsGithub") },
            { speaker: "me", text: this.$t("projectsHelp") },
          ],
          choices: [
            { text: this.$t("tellMeAboutYourself"), next: "aboutMe" },
            { text: this.$t("whatAreYourSkills"), next: "skills" },
            { text: this.$t("goBack"), next: "start" },
          ],
        },
        skills: {
          text: [
            { speaker: "me", text: this.$t("skillsIntro") },
            { speaker: "me2", text: this.$t("skillsLanguages") },
            { speaker: "me", text: this.$t("skillsBackEnd") },
            { speaker: "me", text: this.$t("skillsHelp") },
          ],
          choices: [
            { text: this.$t("tellMeAboutYourself"), next: "aboutMe" },
            { text: this.$t("showMeYourProjects"), next: "projects" },
            { text: this.$t("goBack"), next: "start" },
          ],
        },
      },
      currentNode: "start",
      currentDialogue: "",
      currentSpeaker: "me",
      currentChoices: [],
      dialogueIndex: 0,
      displayedText: "",
      isTyping: false,
      typingSpeed: 40, // Speed of typing effect in milliseconds
      imageToggleInterval: null, // Interval for toggling images
    };
  },
  methods: {
    makeChoice(choice) {
      this.currentNode = choice.next;
      this.dialogueIndex = 0;
      this.currentChoices = []; // Clear choices when a new node is selected
      this.updateDialogue();
    },
    updateDialogue() {
      const node = this.story[this.currentNode];
      if (this.dialogueIndex < node.text.length) {
        const line = node.text[this.dialogueIndex];
        this.currentDialogue = line.text;
        this.dialogueIndex++;
        this.typeText(line.text);
      } else {
        // Update choices when dialogue is finished
        this.currentChoices = node.choices || [];
      }
    },
    typeText(text) {
      this.displayedText = "";
      this.isTyping = true;
      let charIndex = 0;

      // Start toggling images
      this.startImageToggle();

      const typingInterval = setInterval(() => {
        if (charIndex < text.length) {
          this.displayedText += text[charIndex];
          charIndex++;
        } else {
          clearInterval(typingInterval);
          this.isTyping = false; // Ensure this is set to false
          this.stopImageToggle();

          // Wait for 2 seconds before proceeding to the next dialogue or showing choices
          setTimeout(() => {
            if (this.dialogueIndex < this.story[this.currentNode].text.length) {
              this.updateDialogue();
            } else {
              // Ensure choices are updated after typing finishes
              this.currentChoices = this.story[this.currentNode].choices || [];
            }
          }, 500); // 2-second delay
        }
      }, this.typingSpeed);
    },
    startImageToggle() {
      this.imageToggleInterval = setInterval(() => {
        this.currentSpeaker = this.currentSpeaker === "me" ? "me2" : "me";
      }, 100); // Toggle every 200ms
    },
    stopImageToggle() {
      clearInterval(this.imageToggleInterval);
      this.imageToggleInterval = null;
      this.currentSpeaker = "me"; // Ensure the image is always self-image-1 after typing
    },
  },
  mounted() {
    this.updateDialogue();
  },
};
</script>