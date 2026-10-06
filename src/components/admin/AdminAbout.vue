<template>
  <section class="cms-about">
    <!-- Profile -->
    <div class="cms-about-block">
      <h3>{{ $t('adminAboutProfile') }}</h3>
      <div class="cms-toolbar">
        <img v-if="about.avatar" :src="resolveImage(about.avatar)" class="cms-thumb-preview round" alt="" />
        <label class="cms-btn upload" :class="{ disabled: uploading === 'avatar' }">
          <font-awesome-icon icon="upload" /> {{ uploading === 'avatar' ? $t('adminUploading') : $t('adminAboutAvatar') }}
          <input type="file" accept="image/webp,image/jpeg,image/png,image/gif" hidden @change="uploadTo(about, 'avatar', 'about', $event)" />
        </label>
      </div>
      <LocalizedInput v-model="about.status" :label="$t('adminAboutStatus')" />
      <LocalizedInput v-model="about.greeting" :label="$t('adminAboutGreeting')" :defaults="textDefaults(about.greetingKey)" multiline :rows="2" />
    </div>

    <!-- Questions -->
    <div class="cms-about-block">
      <h3>{{ $t('adminAboutQuestions') }}</h3>
      <p class="cms-hint">{{ $t('adminAboutQuestionsHint') }}</p>
      <div class="cms-toolbar">
        <button class="cms-btn primary" @click="addQuestion">
          <font-awesome-icon icon="plus" /> {{ $t('adminAboutNewQuestion') }}
        </button>
      </div>
      <ul class="cms-list">
        <li
          v-for="(q, i) in about.questions"
          :key="q.id"
          class="cms-question"
          :class="{ hidden: q.hidden, dragging: isDragging(about.questions, i) }"
        >
          <div
            class="cms-row"
            :class="{ active: openQuestionId === q.id }"
            draggable="true"
            @dragstart="dragStart(about.questions, i, $event)"
            @dragover.prevent="dragOver(about.questions, i)"
            @dragend="dragEnd"
            @drop.prevent="dragEnd"
          >
            <font-awesome-icon icon="grip-vertical" class="cms-grip" />
            <span class="cms-row-title">
              {{ questionLabel(q) }}
              <small>{{ $t('adminAboutAnswerCount', { n: q.messages.length }) }}<template v-if="q.attachment !== 'none'"> + {{ $t('adminAboutAttach_' + q.attachment) }}</template></small>
            </span>
            <span v-if="q.hidden" class="cms-badge">{{ $t('adminHidden') }}</span>
            <div class="cms-row-buttons">
              <button class="cms-icon-btn" :title="q.hidden ? $t('adminShow') : $t('adminHide')" @click="q.hidden = !q.hidden">
                <font-awesome-icon :icon="q.hidden ? 'eye-slash' : 'eye'" />
              </button>
              <button class="cms-icon-btn" :title="$t('adminEdit')" @click="openQuestionId = openQuestionId === q.id ? null : q.id">
                <font-awesome-icon icon="pen" />
              </button>
              <template v-if="confirmDeleteId === q.id">
                <button class="cms-btn danger small" @click="about.questions.splice(i, 1); confirmDeleteId = null">{{ $t('adminYes') }}</button>
                <button class="cms-btn small" @click="confirmDeleteId = null">{{ $t('adminCancel') }}</button>
              </template>
              <button v-else class="cms-icon-btn danger" :title="$t('adminDelete')" @click="confirmDeleteId = q.id">
                <font-awesome-icon icon="trash" />
              </button>
              <span class="cms-move">
                <button class="cms-icon-btn" :disabled="i === 0" aria-label="Up" @click="move(about.questions, i, -1)">&#9650;</button>
                <button class="cms-icon-btn" :disabled="i === about.questions.length - 1" aria-label="Down" @click="move(about.questions, i, 1)">&#9660;</button>
              </span>
            </div>
          </div>

          <div v-if="openQuestionId === q.id" class="cms-edit-col">
            <LocalizedInput v-model="q.label" :label="$t('adminAboutQuestion')" :defaults="textDefaults(q.labelKey)" />

            <h4 class="cms-card-title">{{ $t('adminAboutAnswers') }}</h4>
            <div v-for="(m, mi) in q.messages" :key="mi" class="cms-message-row">
              <span class="cms-message-nr">{{ mi + 1 }}</span>
              <LocalizedInput v-model="m.text" class="grow" :defaults="textDefaults(m.key)" multiline :rows="2" />
              <div class="cms-move">
                <button class="cms-icon-btn" :disabled="mi === 0" aria-label="Up" @click="move(q.messages, mi, -1)">&#9650;</button>
                <button class="cms-icon-btn" :disabled="mi === q.messages.length - 1" aria-label="Down" @click="move(q.messages, mi, 1)">&#9660;</button>
              </div>
              <button class="cms-icon-btn danger" :title="$t('adminDelete')" @click="q.messages.splice(mi, 1)">
                <font-awesome-icon icon="trash" />
              </button>
            </div>
            <div class="cms-toolbar">
              <button class="cms-btn" @click="q.messages.push({ text: {} })">
                <font-awesome-icon icon="plus" /> {{ $t('adminAboutAddAnswer') }}
              </button>
              <label class="cms-field">
                <span>{{ $t('adminAboutAttachment') }}</span>
                <select v-model="q.attachment" class="cms-input">
                  <option v-for="a in attachments" :key="a" :value="a">{{ $t('adminAboutAttach_' + a) }}</option>
                </select>
              </label>
            </div>
          </div>
        </li>
      </ul>
    </div>

    <!-- CV -->
    <div class="cms-about-block">
      <h3>{{ $t('adminAboutCv') }}</h3>
      <p class="cms-hint">
        <template v-if="about.cv.file">
          <a :href="about.cv.file" target="_blank" rel="noopener">{{ $t('adminAboutCvCurrent') }}</a>
        </template>
        <template v-else>{{ $t('adminAboutCvNone') }}</template>
      </p>
      <div class="cms-toolbar">
        <label class="cms-btn upload" :class="{ disabled: uploading === 'cv' }">
          <font-awesome-icon icon="upload" /> {{ uploading === 'cv' ? $t('adminUploading') : $t('adminAboutCvUpload') }}
          <input type="file" accept="application/pdf" hidden @change="uploadCv" />
        </label>
        <button v-if="about.cv.file" class="cms-btn" @click="about.cv.file = ''">{{ $t('adminAboutCvRemove') }}</button>
        <label class="cms-field grow">
          <span>{{ $t('adminAboutCvName') }}</span>
          <input v-model="about.cv.name" class="cms-input" placeholder="Rick_Ambergen_CV.pdf" />
        </label>
      </div>
    </div>

    <!-- Socials -->
    <div class="cms-about-block">
      <h3>{{ $t('adminAboutSocials') }}</h3>
      <div class="cms-toolbar">
        <button class="cms-btn primary" @click="addSocial">
          <font-awesome-icon icon="plus" /> {{ $t('adminAboutNewSocial') }}
        </button>
      </div>
      <ul class="cms-list">
        <li
          v-for="(s, i) in about.socials"
          :key="s.id"
          class="cms-row cms-social-row"
          :class="{ hidden: s.hidden, dragging: isDragging(about.socials, i) }"
          draggable="true"
          @dragstart="dragStart(about.socials, i, $event)"
          @dragover.prevent="dragOver(about.socials, i)"
          @dragend="dragEnd"
          @drop.prevent="dragEnd"
        >
          <font-awesome-icon icon="grip-vertical" class="cms-grip" />
          <font-awesome-icon :icon="s.icon === 'link' ? 'link' : ['fab', s.icon]" class="cms-layout-icon" />
          <select v-model="s.icon" class="cms-input cms-social-icon">
            <option v-for="icon in socialIcons" :key="icon" :value="icon">{{ icon }}</option>
          </select>
          <input v-model="s.label" class="cms-input cms-social-label" :placeholder="$t('adminPhotoName')" />
          <input v-model="s.url" type="url" class="cms-input grow" placeholder="https://..." />
          <div class="cms-row-buttons">
            <button class="cms-icon-btn" :title="s.hidden ? $t('adminShow') : $t('adminHide')" @click="s.hidden = !s.hidden">
              <font-awesome-icon :icon="s.hidden ? 'eye-slash' : 'eye'" />
            </button>
            <button class="cms-icon-btn danger" :title="$t('adminDelete')" @click="about.socials.splice(i, 1)">
              <font-awesome-icon icon="trash" />
            </button>
            <span class="cms-move">
              <button class="cms-icon-btn" :disabled="i === 0" aria-label="Up" @click="move(about.socials, i, -1)">&#9650;</button>
              <button class="cms-icon-btn" :disabled="i === about.socials.length - 1" aria-label="Down" @click="move(about.socials, i, 1)">&#9660;</button>
            </span>
          </div>
        </li>
      </ul>
    </div>

    <!-- Certificates -->
    <div class="cms-about-block">
      <h3>{{ $t('adminAboutCertificates') }}</h3>
      <div class="cms-toolbar">
        <label class="cms-btn primary upload" :class="{ disabled: uploading === 'certificate' }">
          <font-awesome-icon icon="upload" /> {{ uploading === 'certificate' ? $t('adminUploading') : $t('adminAboutNewCertificate') }}
          <input type="file" accept="image/webp,image/jpeg,image/png,image/gif" hidden @change="addCertificate" />
        </label>
      </div>
      <div class="cms-art-grid">
        <div
          v-for="(c, i) in about.certificates"
          :key="c.id"
          class="cms-art"
          :class="{ hidden: c.hidden, dragging: isDragging(about.certificates, i) }"
          draggable="true"
          @dragstart="dragStart(about.certificates, i, $event)"
          @dragover.prevent="dragOver(about.certificates, i)"
          @dragend="dragEnd"
          @drop.prevent="dragEnd"
        >
          <img :src="resolveImage(c.image)" alt="" />
          <input v-model="c.title" class="cms-input" :placeholder="$t('adminTitle')" />
          <div class="cms-row-buttons">
            <button class="cms-icon-btn" :title="c.hidden ? $t('adminShow') : $t('adminHide')" @click="c.hidden = !c.hidden">
              <font-awesome-icon :icon="c.hidden ? 'eye-slash' : 'eye'" />
            </button>
            <button class="cms-icon-btn" :disabled="i === 0" aria-label="Left" @click="move(about.certificates, i, -1)">&#9664;</button>
            <button class="cms-icon-btn" :disabled="i === about.certificates.length - 1" aria-label="Right" @click="move(about.certificates, i, 1)">&#9654;</button>
            <template v-if="confirmDeleteId === c.id">
              <button class="cms-btn danger small" @click="about.certificates.splice(i, 1); confirmDeleteId = null">{{ $t('adminYes') }}</button>
              <button class="cms-btn small" @click="confirmDeleteId = null">{{ $t('adminCancel') }}</button>
            </template>
            <button v-else class="cms-icon-btn danger" :title="$t('adminDelete')" @click="confirmDeleteId = c.id">
              <font-awesome-icon icon="trash" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script>
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { resolveImage, uploadImage, defaultText, itemText } from "../../contentStore";
import { socialIcons } from "../../aboutData";
import LocalizedInput from "./LocalizedInput.vue";
import reorderMixin from "./reorderMixin";

const newId = (prefix) => prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

export default {
  name: "AdminAbout",
  components: { FontAwesomeIcon, LocalizedInput },
  mixins: [reorderMixin],
  props: {
    // The admin panel's whole editable content; this tab edits draft.about.
    draft: { type: Object, required: true },
  },
  emits: ["flash"],
  data() {
    return {
      langs: ["en", "nl"],
      attachments: ["none", "cv", "socials", "certificates"],
      socialIcons,
      openQuestionId: null,
      confirmDeleteId: null,
      uploading: null, // 'avatar' | 'cv' | 'certificate' while uploading
    };
  },
  computed: {
    about() {
      return this.draft.about;
    },
  },
  methods: {
    resolveImage,
    textDefaults(key) {
      return { en: this.defaultTranslation("en", key), nl: this.defaultTranslation("nl", key) };
    },
    defaultTranslation(lang, key) {
      if (!key) return "";
      return this.draft.texts?.[lang]?.[key] ?? defaultText(lang, key) ?? "";
    },
    questionLabel(q) {
      return itemText(q.label, q.labelKey, this.$t("adminAboutNewQuestion"));
    },
    async uploadTo(target, field, folder, e) {
      const file = e.target.files[0];
      e.target.value = "";
      if (!file) return null;
      this.uploading = field;
      const url = await uploadImage(file, folder);
      this.uploading = null;
      if (!url) {
        this.$emit("flash", "error", "adminUploadError");
        return null;
      }
      if (target) target[field] = url;
      return { url, file };
    },
    async uploadCv(e) {
      const result = await this.uploadTo(null, "cv", "cv", e);
      if (!result) return;
      this.about.cv.file = result.url;
      if (!this.about.cv.name) this.about.cv.name = result.file.name;
    },
    async addCertificate(e) {
      const result = await this.uploadTo(null, "certificate", "about", e);
      if (!result) return;
      this.about.certificates.push({
        id: newId("c"),
        title: result.file.name.replace(/\.[^.]+$/, ""),
        image: result.url,
        hidden: false,
      });
    },
    addQuestion() {
      const question = { id: newId("q"), label: { en: "", nl: "" }, messages: [{ text: {} }], attachment: "none", hidden: false };
      this.about.questions.push(question);
      this.openQuestionId = question.id;
    },
    addSocial() {
      this.about.socials.push({ id: newId("s"), icon: "link", label: "", url: "", hidden: false });
    },
  },
};
</script>
