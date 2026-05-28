<template>
  <div class="camera-app">
    <!-- Privacy notice + remaining counter: always visible at the top -->
    <div class="camera-banner">
      <p class="camera-notice">
        <font-awesome-icon icon="camera" class="camera-notice-icon" />
        {{ $t('cameraNotice') }}
      </p>
      <span class="camera-counter">{{ $t('cameraRemaining', { n: remaining }) }}</span>
    </div>

    <!-- Limit reached: no camera, just a thank-you -->
    <div v-if="remaining <= 0" class="camera-state">
      <font-awesome-icon icon="trophy" class="camera-state-icon" />
      <p>{{ $t('cameraLimit') }}</p>
    </div>

    <!-- Camera access error / unsupported -->
    <div v-else-if="errorMsg" class="camera-state">
      <font-awesome-icon icon="camera" class="camera-state-icon" />
      <p>{{ errorMsg }}</p>
      <button class="camera-btn camera-btn-primary" @click="startCamera">
        {{ $t('cameraRetry') }}
      </button>
    </div>

    <!-- Review screen: a photo has been captured -->
    <div v-else-if="capturedUrl" class="camera-review">
      <div class="camera-stage">
        <img :src="capturedUrl" class="camera-photo" alt="captured photo" />
        <div v-if="sentOk" class="camera-sent-overlay">
          <font-awesome-icon icon="camera" class="camera-state-icon" />
          <p>{{ $t('cameraSent') }}</p>
          <button
            v-if="remaining > 0"
            class="camera-btn camera-btn-primary"
            @click="retake"
          >
            {{ $t('cameraAnother') }}
          </button>
          <p v-else class="camera-sent-limit">{{ $t('cameraLimit') }}</p>
        </div>
      </div>
      <div class="camera-controls" v-if="!sentOk">
        <button
          class="camera-btn"
          :disabled="sending"
          @click="retake"
        >
          {{ $t('cameraRetake') }}
        </button>
        <button
          class="camera-btn camera-btn-primary"
          :disabled="sending"
          @click="send"
        >
          {{ sending ? $t('cameraSending') : $t('cameraSend') }}
        </button>
      </div>
    </div>

    <!-- Live viewfinder -->
    <div v-else class="camera-live">
      <div class="camera-stage">
        <video
          ref="video"
          class="camera-video"
          autoplay
          playsinline
          muted
        ></video>
      </div>
      <div class="camera-controls">
        <button
          class="camera-icon-btn"
          :title="$t('cameraFlip')"
          :aria-label="$t('cameraFlip')"
          @click="flipCamera"
        >
          <font-awesome-icon icon="camera-rotate" />
        </button>
        <button
          class="camera-shutter"
          :disabled="!videoReady"
          :title="$t('cameraShutter')"
          :aria-label="$t('cameraShutter')"
          @click="capture"
        ></button>
        <span class="camera-icon-spacer"></span>
      </div>
    </div>
  </div>
</template>

<script>
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { sendPhoto } from "../../cameraMailer";

const STORAGE_KEY = "camera-photos-sent";
const LIMIT = 5;

function readSent() {
  try {
    const n = parseInt(localStorage.getItem(STORAGE_KEY) || "0", 10);
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch (_) {
    return 0;
  }
}

function writeSent(n) {
  try {
    localStorage.setItem(STORAGE_KEY, String(n));
  } catch (_) {
    // Private mode / quota - the in-memory counter still works for this session.
  }
}

export default {
  name: "CameraApp",
  components: { FontAwesomeIcon },
  data() {
    return {
      stream: null,
      facingMode: "environment",
      videoReady: false,
      capturedUrl: null,
      capturedBlob: null,
      sending: false,
      sentOk: false,
      errorMsg: "",
      sentCount: readSent(),
    };
  },
  computed: {
    remaining() {
      return Math.max(0, LIMIT - this.sentCount);
    },
  },
  mounted() {
    if (this.remaining > 0) this.startCamera();
  },
  beforeUnmount() {
    this.stopStream();
    this.revokeCaptured();
  },
  methods: {
    stopStream() {
      if (this.stream) {
        this.stream.getTracks().forEach((t) => t.stop());
        this.stream = null;
      }
      this.videoReady = false;
    },
    revokeCaptured() {
      if (this.capturedUrl) {
        URL.revokeObjectURL(this.capturedUrl);
        this.capturedUrl = null;
      }
      this.capturedBlob = null;
    },
    async startCamera() {
      this.errorMsg = "";
      this.stopStream();
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        this.errorMsg = this.$t("cameraDenied");
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: this.facingMode },
          audio: false,
        });
        this.stream = stream;
        // The <video> element only exists while the live view is rendered.
        await this.$nextTick();
        const video = this.$refs.video;
        if (!video) {
          // View changed away from live (e.g. component closing) - release.
          this.stopStream();
          return;
        }
        video.srcObject = stream;
        video.onloadedmetadata = () => {
          this.videoReady = true;
        };
      } catch (_) {
        this.stopStream();
        this.errorMsg = this.$t("cameraDenied");
      }
    },
    async flipCamera() {
      this.facingMode = this.facingMode === "environment" ? "user" : "environment";
      await this.startCamera();
    },
    capture() {
      const video = this.$refs.video;
      if (!video || !this.videoReady) return;
      const w = video.videoWidth;
      const h = video.videoHeight;
      if (!w || !h) return;
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      canvas.getContext("2d").drawImage(video, 0, 0, w, h);
      canvas.toBlob(
        (blob) => {
          if (!blob) return;
          this.revokeCaptured();
          this.capturedBlob = blob;
          this.capturedUrl = URL.createObjectURL(blob);
          // Freeze the camera while reviewing to release the device.
          this.stopStream();
        },
        "image/jpeg",
        0.92
      );
    },
    async retake() {
      this.revokeCaptured();
      this.sentOk = false;
      await this.startCamera();
    },
    async send() {
      if (!this.capturedBlob || this.sending) return;
      this.sending = true;
      const ok = await sendPhoto(this.capturedBlob);
      this.sending = false;
      if (ok) {
        this.sentCount += 1;
        writeSent(this.sentCount);
        this.sentOk = true;
      } else {
        this.errorMsg = this.$t("cameraFailed");
        this.revokeCaptured();
      }
    },
  },
};
</script>

<style scoped>
.camera-app {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #1a1a24;
  color: #fff;
}

.camera-banner {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px 16px;
  background: #2d0a35;
  border-bottom: 2px solid #4f115d;
}

.camera-notice {
  margin: 0;
  font-size: 13px;
  line-height: 1.35;
  color: #f0e6f7;
  display: flex;
  align-items: center;
  gap: 8px;
}

.camera-notice-icon {
  color: #d4a8e8;
  flex-shrink: 0;
}

.camera-counter {
  align-self: flex-start;
  font-size: 12px;
  font-weight: bold;
  padding: 3px 10px;
  border-radius: 12px;
  background: #9b20b7;
  color: #fff;
}

/* Live view + review share the same stage geometry */
.camera-live,
.camera-review {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.camera-stage {
  position: relative;
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #000;
  overflow: hidden;
}

.camera-video,
.camera-photo {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.camera-sent-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  background: rgba(26, 16, 36, 0.88);
  font-size: 18px;
  font-weight: bold;
}

.camera-sent-limit {
  margin: 0;
  font-size: 14px;
  font-weight: normal;
  color: #d4a8e8;
  max-width: 280px;
  text-align: center;
}

/* In the column-flex overlay the shared .camera-btn flex:1 would stretch the
   button to full height - keep it a normal compact button here. */
.camera-sent-overlay .camera-btn {
  flex: 0 0 auto;
  width: auto;
  padding: 12px 28px;
}

.camera-controls {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-around;
  gap: 12px;
  padding: 16px;
  padding-bottom: calc(16px + env(safe-area-inset-bottom, 0));
  background: #1a1a24;
}

.camera-shutter {
  width: 68px;
  height: 68px;
  border-radius: 50%;
  background: #fff;
  border: 4px solid #9b20b7;
  box-shadow: 0 0 0 3px #1a1a24, 0 4px 10px rgba(0, 0, 0, 0.4);
  cursor: pointer;
  transition: transform 0.12s ease;
}

.camera-shutter:active {
  transform: scale(0.92);
}

.camera-shutter:disabled {
  opacity: 0.4;
  cursor: default;
}

.camera-icon-btn {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.25);
  color: #fff;
  font-size: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.camera-icon-btn:active {
  background: rgba(255, 255, 255, 0.22);
}

/* Keeps the shutter centred opposite the flip button */
.camera-icon-spacer {
  width: 48px;
  height: 48px;
}

.camera-btn {
  flex: 1;
  max-width: 200px;
  padding: 12px 16px;
  border-radius: 10px;
  border: 2px solid #4f115d;
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
  font-family: inherit;
  font-size: 15px;
  font-weight: bold;
  cursor: pointer;
}

.camera-btn-primary {
  background: #9b20b7;
  border-color: #9b20b7;
}

.camera-btn:disabled {
  opacity: 0.5;
  cursor: default;
}

.camera-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  text-align: center;
  padding: 32px 24px;
}

.camera-state-icon {
  font-size: 44px;
  color: #9b20b7;
}

.camera-state p {
  margin: 0;
  font-size: 16px;
  line-height: 1.4;
  max-width: 320px;
}
</style>
