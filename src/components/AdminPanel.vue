<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";

type ProviderMode = "esg-proxy" | "openai-compatible";
type ProviderPreset = "custom" | "gemini" | "groq" | "openai";
type CharacterId = "aikka" | "field-guide";

const PROVIDERS: Record<Exclude<ProviderPreset, "custom">, { baseUrl: string; model: string }> = {
  gemini: {
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    model: "gemini-3.6-flash",
  },
  groq: {
    baseUrl: "https://api.groq.com/openai/v1",
    model: "openai/gpt-oss-120b",
  },
  openai: {
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4.1-mini",
  },
};

interface LlmConfig {
  mode: ProviderMode;
  esg: {
    hasApiToken: boolean;
    origin: string;
  };
  openai: {
    baseUrl: string;
    hasApiKey: boolean;
    model: string;
    provider: ProviderPreset;
    systemPrompt: string;
  };
  ui: {
    character: CharacterId;
  };
}

const emit = defineEmits<{
  close: [];
  saved: [settings: {
    character: CharacterId;
    mode: ProviderMode;
    provider: ProviderPreset;
  }];
}>();

const error = ref("");
const isLoading = ref(true);
const isSaving = ref(false);
const password = ref("");
const signedIn = ref(false);
const success = ref("");
const apiKey = ref("");
const form = reactive({
  baseUrl: "",
  character: "aikka" as CharacterId,
  esgOrigin: "",
  mode: "openai-compatible" as ProviderMode,
  model: "",
  provider: "openai" as ProviderPreset,
  systemPrompt: "",
});
const hasApiKey = ref(false);

async function requestJson<T>(input: string, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    credentials: "same-origin",
    headers: init?.body ? { "Content-Type": "application/json" } : undefined,
    ...init,
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { detail?: string } | null;
    throw new Error(payload?.detail ?? `HTTP ${response.status}`);
  }
  return response.status === 204 ? (undefined as T) : response.json() as Promise<T>;
}

function applyConfig(config: LlmConfig): void {
  form.baseUrl = config.openai.baseUrl;
  form.character = config.ui.character;
  form.esgOrigin = config.esg.origin;
  form.mode = config.mode;
  form.model = config.openai.model;
  form.provider = config.openai.provider;
  form.systemPrompt = config.openai.systemPrompt;
  hasApiKey.value = config.openai.hasApiKey;
}

async function loadConfig(): Promise<void> {
  const config = await requestJson<LlmConfig>("/api/admin/llm-config");
  applyConfig(config);
}

async function checkSession(): Promise<void> {
  try {
    const session = await requestJson<{ signedIn: boolean }>("/api/admin/session");
    signedIn.value = session.signedIn;
    if (session.signedIn) await loadConfig();
  } catch (caughtError) {
    error.value = caughtError instanceof Error ? caughtError.message : "Unable to reach Admin.";
  } finally {
    isLoading.value = false;
  }
}

async function signIn(): Promise<void> {
  if (!password.value) return;
  error.value = "";
  isSaving.value = true;
  try {
    await requestJson("/api/admin/session", {
      body: JSON.stringify({ password: password.value }),
      method: "POST",
    });
    password.value = "";
    signedIn.value = true;
    await loadConfig();
  } catch (caughtError) {
    error.value = caughtError instanceof Error ? caughtError.message : "Sign-in failed.";
  } finally {
    isSaving.value = false;
  }
}

function selectProvider(): void {
  if (form.provider === "custom") return;
  const preset = PROVIDERS[form.provider];
  form.baseUrl = preset.baseUrl;
  form.model = preset.model;
}

async function save(): Promise<void> {
  error.value = "";
  success.value = "";
  isSaving.value = true;
  try {
    const config = await requestJson<LlmConfig>("/api/admin/llm-config", {
      body: JSON.stringify({
        mode: form.mode,
        esg: { origin: form.esgOrigin },
        openai: {
          apiKey: apiKey.value,
          baseUrl: form.baseUrl,
          model: form.model,
          provider: form.provider,
          systemPrompt: form.systemPrompt,
        },
        ui: { character: form.character },
      }),
      method: "PUT",
    });
    apiKey.value = "";
    applyConfig(config);
    success.value = "已儲存；新的聊天會立即使用此設定。";
    emit("saved", {
      character: config.ui.character,
      mode: config.mode,
      provider: config.openai.provider,
    });
  } catch (caughtError) {
    error.value = caughtError instanceof Error ? caughtError.message : "儲存失敗。";
  } finally {
    isSaving.value = false;
  }
}

async function signOut(): Promise<void> {
  await requestJson("/api/admin/session", { method: "DELETE" });
  signedIn.value = false;
  success.value = "";
}

onMounted(checkSession);
</script>

<template>
  <div class="admin-backdrop" @click.self="emit('close')">
    <section class="admin-panel" aria-labelledby="admin-title" role="dialog" aria-modal="true">
      <header class="admin-panel__header">
        <div>
          <p class="admin-panel__eyebrow">NOOK CONTROL</p>
          <h2 id="admin-title">Nook 設定後台</h2>
        </div>
        <button class="admin-panel__close" type="button" aria-label="關閉後台" @click="emit('close')">×</button>
      </header>

      <p v-if="isLoading" class="admin-panel__note">載入設定中…</p>

      <form v-else-if="!signedIn" class="admin-form" @submit.prevent="signIn">
        <p class="admin-panel__note">輸入伺服器的管理密碼後，才能變更人偶與 LLM API 設定。</p>
        <label>
          管理密碼
          <input v-model="password" autocomplete="current-password" type="password" required>
        </label>
        <p v-if="error" class="admin-panel__error" role="alert">{{ error }}</p>
        <button class="admin-panel__save" :disabled="isSaving || !password" type="submit">
          {{ isSaving ? "登入中…" : "進入後台" }}
        </button>
      </form>

      <form v-else class="admin-form" @submit.prevent="save">
        <fieldset>
          <legend>預設人偶</legend>
          <label class="admin-character">
            <input v-model="form.character" type="radio" value="aikka">
            <img src="/nook-guide/avatars/aikka/aikka-avatar.png?v=3" alt="">
            <span><strong>AIKKA 女角</strong><small>原本的動畫角色</small></span>
          </label>
          <label class="admin-character">
            <input v-model="form.character" type="radio" value="field-guide">
            <img src="/nook-guide/avatars/field-guide/vietnam-field-guide-8bit-idle.png?v=1" alt="">
            <span><strong>8-bit 男角</strong><small>Q 版復古電玩風格</small></span>
          </label>
        </fieldset>

        <fieldset>
          <legend>聊天來源</legend>
          <label class="admin-choice">
            <input v-model="form.mode" type="radio" value="openai-compatible">
            <span>
              <strong>OpenAI-compatible</strong>
              <small>直接呼叫 Base URL 的 <code>/chat/completions</code></small>
            </span>
          </label>
          <label class="admin-choice">
            <input v-model="form.mode" type="radio" value="esg-proxy">
            <span>
              <strong>原 ESG API</strong>
              <small>沿用既有的 ESG session 與知識庫服務</small>
            </span>
          </label>
        </fieldset>

        <template v-if="form.mode === 'openai-compatible'">
          <label>
            LLM 供應商
            <select v-model="form.provider" @change="selectProvider">
              <option value="openai">OpenAI</option>
              <option value="groq">Groq</option>
              <option value="gemini">Google Gemini</option>
              <option value="custom">自訂 OpenAI-compatible</option>
            </select>
            <small>選擇供應商會自動帶入 Base URL 與建議 Model，仍可自行修改。</small>
          </label>
          <label>
            Base URL
            <input v-model="form.baseUrl" inputmode="url" placeholder="https://api.openai.com/v1" required type="url">
            <small>輸入到 <code>/v1</code> 即可；後台會補上 <code>/chat/completions</code>。</small>
          </label>
          <label>
            API key
            <input v-model="apiKey" autocomplete="off" placeholder="留空代表保留既有金鑰" type="password">
            <small>{{ hasApiKey ? "Vercel 環境或伺服器已有金鑰；前端無法讀取。" : form.provider === "custom" ? "自訂服務可不填金鑰。" : "Vercel 尚未設定此供應商金鑰。" }}</small>
          </label>
          <label>
            Model
            <input v-model="form.model" placeholder="gpt-4.1-mini" required type="text">
          </label>
          <label>
            System prompt
            <textarea v-model="form.systemPrompt" rows="4"></textarea>
          </label>
        </template>

        <template v-else>
          <label>
            ESG API Origin
            <input v-model="form.esgOrigin" inputmode="url" placeholder="http://host.docker.internal:8913" type="url">
            <small>Token 仍只保留在伺服器的啟動環境中。</small>
          </label>
        </template>

        <p v-if="error" class="admin-panel__error" role="alert">{{ error }}</p>
        <p v-if="success" class="admin-panel__success" role="status">{{ success }}</p>
        <footer class="admin-panel__footer">
          <button class="admin-panel__logout" type="button" @click="signOut">登出</button>
          <button class="admin-panel__save" :disabled="isSaving" type="submit">
            {{ isSaving ? "儲存中…" : "儲存設定" }}
          </button>
        </footer>
      </form>
    </section>
  </div>
</template>
