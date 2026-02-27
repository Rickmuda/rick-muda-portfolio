<template>
  <div class="mail-client">
    <div class="mail-toolbar">New Message</div>
    <div class="mail-form">
      <div class="field-row">
        <span>To:</span>
        <input type="text" value="rickmudaportfolio@gmail.com" class="readonly-field" readonly />
      </div>
      <div class="field-row">
        <span>Subject:</span>
        <input type="text" placeholder="Enter subject..." />
      </div>
      <div class="field-column">
        <span>Message:</span>
        <textarea placeholder="Write your message..."></textarea>
      </div>
      <div class="mail-actions">
        <button @click="openMail">Send via Email Client</button>
        <span class="mail-status">Opens your default email app</span>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  methods: {
    openMail() {
      window.location.href = "mailto:rickmudaportfolio@gmail.com";
    }
  }
}
</script>

<style scoped>
.mail-client {
  height: 100%;
  border: 2px solid #000;
  background: #1a1a24;
  display: flex;
  flex-direction: column;
}

.mail-toolbar {
  background: linear-gradient(180deg, #2a2a35, #1f1f2d);
  border-bottom: 2px solid #8404a1;
  padding: 10px 12px;
  color: #d0c8db;
  font-weight: 600;
}

.mail-form {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  flex: 1;
  max-width: 500px;
  margin: 0 auto;
  width: 100%;
}

.field-row,
.field-column {
  display: flex;
  gap: 12px;
  color: #d0c8db;
  flex-direction: column;
}

.field-row {
  flex-direction: row;
  align-items: center;
}

.field-row span,
.field-column span {
  min-width: 70px;
  padding-top: 2px;
  color: #b98dc7;
  font-weight: 600;
  font-size: 13px;
}

.field-row input,
.field-column textarea {
  width: 100%;
  border: 1px solid #4f115d;
  border-radius: 4px;
  padding: 8px 10px;
  font-family: inherit;
  background: #252535;
  color: #d0c8db;
  font-size: 14px;
}

.field-row input::placeholder,
.field-column textarea::placeholder {
  color: #7a7a8e;
}

.field-row input:focus,
.field-column textarea:focus {
  outline: none;
  border-color: #9b20b7;
  box-shadow: 0 0 0 2px rgba(155, 32, 183, 0.1);
}

.field-column textarea {
  min-height: 120px;
  resize: none;
}

.readonly-field {
  background: #1f1f2d;
  color: #d0c8db;
  cursor: not-allowed;
  opacity: 0.7;
}

.mail-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: auto;
  padding-top: 14px;
  border-top: 1px solid #3a3a48;
}

.mail-actions button {
  background: #9b20b7;
  border: 1px solid #7a1897;
  color: #fff;
  border-radius: 6px;
  padding: 10px 16px;
  cursor: pointer;
  font-family: inherit;
  font-weight: 600;
  font-size: 13px;
  transition: background 0.2s ease;
  text-shadow: -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000;
}

.mail-actions button:hover:not(:disabled) {
  background: #8313a0;
}

.mail-actions button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.mail-status {
  color: #c0b8cc;
  font-size: 13px;
  margin-left: auto;
}
</style>
