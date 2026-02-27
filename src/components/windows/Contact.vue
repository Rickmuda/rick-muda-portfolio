<template>
  <div class="mail-client">
    <div class="mail-toolbar">New Message</div>
    <form class="mail-form" @submit.prevent="sendMail">
      <label class="field-row">
        <span>To:</span>
        <input type="email" v-model="to" readonly class="readonly-field" />
      </label>

      <label class="field-row">
        <span>From:</span>
        <input type="email" v-model="email" :placeholder="$t('enterEmail')" />
      </label>

      <label class="field-row">
        <span>Name:</span>
        <input type="text" v-model="fullName" :placeholder="$t('enterFullName')" />
      </label>

      <label class="field-column">
        <span>Message:</span>
        <textarea v-model="message" :placeholder="$t('enterMessage')"></textarea>
      </label>

      <div class="mail-actions">
        <button type="submit" :disabled="isSending">{{ isSending ? 'Sending...' : $t('sendEmail') }}</button>
        <span class="mail-status" v-if="statusMessage">{{ statusMessage }}</span>
      </div>
    </form>
  </div>
</template>

<script>
export default {
  name: 'Contact',
  data() {
    return {
      to: "rickmudaportfolio@gmail.com",
      email: "",
      fullName: "",
      message: "",
      isSending: false,
      statusMessage: "",
    };
  },
  methods: {
    async sendMail() {
      if (!this.email || !this.fullName || !this.message) {
        this.statusMessage = this.$t('fillAllFields');
        return;
      }

      this.isSending = true;
      this.statusMessage = "";

      try {
        const baseUrl = import.meta.env.VITE_API_URL || "";
        const response = await fetch(`${baseUrl}/send-email`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: this.email,
            fullName: this.fullName,
            message: this.message,
          }),
        });

        if (!response.ok) {
          throw new Error("send-failed");
        }

        this.statusMessage = this.$t('messageSent');
        this.email = "";
        this.fullName = "";
        this.message = "";
      } catch (error) {
        console.error(error);
        this.statusMessage = this.$t('messageFailed');
      } finally {
        this.isSending = false;
      }
    }
  }
}
</script>

<style scoped>
.mail-client {
  height: 100%;
  border: 2px solid #000;
  background: #f5f7fb;
}

.mail-toolbar {
  background: linear-gradient(180deg, #ebf0fa, #d8e2f1);
  border-bottom: 1px solid #98a8bf;
  padding: 8px 12px;
  color: #1f2d3d;
}

.mail-form {
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.field-row,
.field-column {
  display: flex;
  gap: 10px;
  color: #1f2d3d;
}

.field-row span,
.field-column span {
  min-width: 70px;
  padding-top: 6px;
}

.field-row input,
.field-column textarea {
  width: 100%;
  border: 1px solid #8e9db3;
  border-radius: 4px;
  padding: 6px 8px;
  font-family: inherit;
}

.field-column textarea {
  min-height: 180px;
  resize: vertical;
}

.readonly-field {
  background: #e4eaf4;
  color: #3a3a3a;
}

.mail-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.mail-actions button {
  background: #9b20b7;
  border: 1px solid #4f115d;
  color: #fff;
  border-radius: 6px;
  padding: 8px 14px;
  cursor: pointer;
  font-family: inherit;
}

.mail-status {
  color: #2b3f56;
}
</style>