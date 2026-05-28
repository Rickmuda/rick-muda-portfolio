<template>
  <div class="muda-terminal" @click="focusInput">
    <div ref="log" class="muda-log">
      <div
        v-for="(entry, i) in history"
        :key="i"
        class="muda-entry"
        :class="entry.type"
      >
        <template v-if="entry.type === 'input'">
          <span class="muda-prompt">{{ prompt }}</span> {{ entry.text }}
        </template>
        <template v-else>
          <span v-for="(line, j) in entry.lines" :key="j" class="muda-line">
            <a
              v-if="line.href"
              :href="line.href"
              target="_blank"
              rel="noopener"
              @click.stop
            >{{ line.text }}</a>
            <template v-else>{{ line.text }}</template>
          </span>
        </template>
      </div>

      <div class="muda-inputline">
        <span class="muda-prompt">{{ prompt }}</span>
        <input
          ref="input"
          v-model="current"
          class="muda-input"
          type="text"
          autocomplete="off"
          autocapitalize="off"
          spellcheck="false"
          @input="onType"
          @keydown.enter="run"
          @keydown.up.prevent="recall(-1)"
          @keydown.down.prevent="recall(1)"
        />
      </div>
    </div>
  </div>
</template>

<script>
// A fake retro terminal that surfaces the user's company, MudaDigitaal. Commands print
// company info; `open` launches the real site. All output text comes from i18n (EN/NL).
import { sounds } from "../../sounds";

const WEBSITE = "https://mudadigitaal.nl";
const EMAIL = "rickmudadigitaal@gmail.com";

export default {
  name: "MudaTerminal",
  data() {
    return {
      prompt: "muda@digitaal:~$",
      current: "",
      history: [], // { type: 'input', text } | { type: 'output' | 'error', lines: [{ text, href? }] }
      commandLog: [], // raw commands, for Up/Down recall
      recallIndex: null,
    };
  },
  mounted() {
    this.printText(this.$t("mudaWelcome"));
    this.focusInput();
  },
  methods: {
    focusInput() {
      this.$nextTick(() => this.$refs.input && this.$refs.input.focus());
    },
    onType() {
      sounds.play("type");
    },
    scrollToBottom() {
      this.$nextTick(() => {
        const log = this.$refs.log;
        if (log) log.scrollTop = log.scrollHeight;
      });
    },
    // Push a multi-line block. Each line may be a plain string or { text, href }.
    print(lines, type = "output") {
      const normalized = lines.map((l) =>
        typeof l === "string" ? { text: l } : l
      );
      this.history.push({ type, lines: normalized });
      this.scrollToBottom();
    },
    // Convenience: split an i18n string on newlines into output lines.
    printText(text, type = "output") {
      this.print(text.split("\n"), type);
    },
    run() {
      const raw = this.current.trim();
      this.current = "";
      this.recallIndex = null;
      this.history.push({ type: "input", text: raw });
      if (raw) this.commandLog.push(raw);
      if (raw) this.execute(raw.toLowerCase());
      this.scrollToBottom();
    },
    execute(cmd) {
      switch (cmd) {
        case "help":
          this.printText(this.$t("mudaHelp"));
          break;
        case "about":
          this.printText(this.$t("mudaAbout"));
          break;
        case "services":
          this.printText(this.$t("mudaServices"));
          break;
        case "contact":
          this.print([
            { text: this.$t("mudaContactLine", { email: EMAIL }), href: `mailto:${EMAIL}` },
          ]);
          break;
        case "open":
        case "website":
          this.printText(this.$t("mudaOpening"));
          window.open(WEBSITE, "_blank", "noopener");
          break;
        case "clear":
          this.history = [];
          break;
        default:
          this.print([this.$t("mudaUnknown", { cmd })], "error");
      }
    },
    recall(direction) {
      if (!this.commandLog.length) return;
      if (this.recallIndex === null) {
        this.recallIndex = this.commandLog.length;
      }
      this.recallIndex = Math.min(
        this.commandLog.length,
        Math.max(0, this.recallIndex + direction)
      );
      this.current =
        this.recallIndex === this.commandLog.length
          ? ""
          : this.commandLog[this.recallIndex];
    },
  },
};
</script>

<style scoped>
.muda-terminal {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #1a1a24;
  border: 2px solid #000;
  cursor: text;
  overflow: hidden;
}

.muda-log {
  flex: 1;
  overflow-y: auto;
  padding: 12px 14px;
  font-family: "Consolas", "Menlo", "DejaVu Sans Mono", monospace;
  font-size: 14px;
  line-height: 1.5;
  color: #e6e0ea;
}

.muda-entry {
  white-space: pre-wrap;
  word-break: break-word;
}

.muda-entry.error {
  color: #ff6b8b;
}

.muda-line {
  display: block;
}

.muda-prompt {
  color: #c637e6;
  font-weight: 700;
}

.muda-inputline {
  display: flex;
  align-items: center;
  gap: 8px;
}

.muda-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: #e6e0ea;
  font-family: inherit;
  font-size: inherit;
  caret-color: #c637e6;
}

.muda-log a {
  color: #c637e6;
  text-decoration: underline;
}

/* Purple scrollbar to match the theme */
.muda-log::-webkit-scrollbar {
  width: 10px;
}
.muda-log::-webkit-scrollbar-thumb {
  background: #9b20b7;
  border-radius: 5px;
}
.muda-log::-webkit-scrollbar-track {
  background: #2a0a3a;
}
</style>
