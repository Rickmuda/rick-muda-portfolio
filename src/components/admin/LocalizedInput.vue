<template>
  <div class="cms-loc">
    <div class="cms-loc-head">
      <span class="cms-loc-label">{{ label }}</span>
      <button v-if="isChanged" type="button" class="cms-link-btn" @click="reset">
        {{ $t('adminReset') }}
      </button>
    </div>
    <div class="cms-loc-fields" :class="{ stacked: multiline }">
      <label v-for="lang in langs" :key="lang" class="cms-loc-field">
        <span class="cms-lang">{{ lang.toUpperCase() }}</span>
        <textarea
          v-if="multiline"
          class="cms-input"
          :rows="rows"
          :value="shown(lang)"
          :placeholder="placeholder(lang)"
          @input="set(lang, $event.target.value)"
          @blur="typing[lang] = undefined"
        ></textarea>
        <input
          v-else
          class="cms-input"
          :value="shown(lang)"
          :placeholder="placeholder(lang)"
          @input="set(lang, $event.target.value)"
          @blur="typing[lang] = undefined"
        />
      </label>
    </div>
  </div>
</template>

<script>
// One { en, nl } text field. Shows the real text (the custom one, or else the
// built-in default) instead of a faded placeholder, and only stores a custom
// value when it differs from the default - so untouched texts keep following
// the defaults/Texts tab, and "Reset" brings the default back.
export default {
  name: "LocalizedInput",
  props: {
    // The { en, nl } object to edit in place.
    modelValue: { type: Object, required: true },
    label: { type: String, default: "" },
    // Built-in text per language, e.g. { en: "...", nl: "..." } (may be empty).
    defaults: { type: Object, default: () => ({}) },
    multiline: { type: Boolean, default: false },
    rows: { type: Number, default: 3 },
  },
  data() {
    return {
      langs: ["en", "nl"],
      // What's being typed right now, so clearing a field doesn't make the
      // default text jump back in mid-edit (it returns on blur).
      typing: {},
    };
  },
  computed: {
    isChanged() {
      return this.langs.some((lang) => this.hasCustom(lang) && (this.defaults[lang] || "") !== "");
    },
  },
  methods: {
    hasCustom(lang) {
      return typeof this.modelValue[lang] === "string" && this.modelValue[lang] !== "";
    },
    shown(lang) {
      if (this.typing[lang] !== undefined) return this.typing[lang];
      return this.hasCustom(lang) ? this.modelValue[lang] : this.defaults[lang] || "";
    },
    // An empty Dutch field falls back to the English text on the site.
    placeholder(lang) {
      if (lang === "nl") return this.shown("en") ? this.$t("adminSameAsEnglish") : "";
      return "";
    },
    set(lang, value) {
      this.typing[lang] = value;
      if (value === (this.defaults[lang] || "") || value === "") delete this.modelValue[lang];
      else this.modelValue[lang] = value;
    },
    reset() {
      this.typing = {};
      for (const lang of this.langs) delete this.modelValue[lang];
    },
  },
};
</script>
