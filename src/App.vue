<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref, watch } from "vue";

import ChatMessage from "./components/ChatMessage.vue";
import AdminPanel from "./components/AdminPanel.vue";
import StageCharacter from "./components/StageCharacter.vue";
import TopicRail from "./components/TopicRail.vue";
import { createSession, fetchTopics, sendMessage } from "./services/chatApi";
import type {
  ChatMessage as ChatMessageType,
  CharacterId,
  Language,
  ProviderId,
  StageState,
  TopicCategory,
} from "./types";

type SendState = "default" | "error" | "loading" | "success";

interface InterfaceCopy {
  chatLabel: string;
  composerHelp: string;
  composerLabel: string;
  greeting: string;
  placeholder: string;
  reset: string;
  searchError: string;
  searching: string;
  send: string;
  sent: string;
  topicError: string;
}

const COPY_BY_LANGUAGE: Record<Language, InterfaceCopy> = {
  en: {
    chatLabel: "AI conversation",
    composerHelp: "Enter to send · Shift + Enter for a new line",
    composerLabel: "Your question",
    greeting: "Hi, I’m Mia. Ask me anything.",
    placeholder: "For example: How should a company assess Scope 3 emissions?",
    reset: "Reset",
    searchError: "The chat API could not complete the request",
    searching: "Searching",
    send: "Send",
    sent: "Done",
    topicError: "Topics are temporarily unavailable",
  },
  zh: {
    chatLabel: "AI 對話",
    composerHelp: "Enter 送出 · Shift + Enter 換行",
    composerLabel: "你的問題",
    greeting: "嗨，我是 Mia。想知道什麼？跟我說，我幫你找。",
    placeholder: "想知道什麼？跟 Mia 說",
    reset: "重設",
    searchError: "聊天 API 無法完成請求",
    searching: "查找中",
    send: "送出",
    sent: "已完成",
    topicError: "Topic 暫時無法同步",
  },
};

const MINIMUM_THINKING_TIME_MS = 2500;
const SUCCESS_STATE_DURATION_MS = 900;

const categories = ref<TopicCategory[]>([]);
const backgroundCredit = ref("");
const characterId = ref<CharacterId>("mia");
const composer = ref("");
const error = ref("");
const isAdminOpen = ref(false);
const isLoadingTopics = ref(true);
const language = ref<Language>("zh");
const messages = ref<ChatMessageType[]>([]);
const messageList = ref<HTMLElement>();
const providerId = ref<ProviderId>("openai");
const providerOptions = ref<Array<{
  configured: boolean;
  id: ProviderId;
  label: string;
  model: string;
}>>([]);
const sendState = ref<SendState>("default");
const sessionId = ref("");
const stageState = ref<StageState>("idle");
const topicError = ref("");

const isWorking = computed(() => stageState.value !== "idle");
const copy = computed(() => COPY_BY_LANGUAGE[language.value]);
const characters: Record<CharacterId, { label: string; name: string; avatar: string }> = {
  mia: {
    avatar: "/nook-guide/avatars/mia/mia-avatar.png?v=4",
    label: "Mia",
    name: "Mia",
  },
  norman: {
    avatar: "/nook-guide/avatars/norman/norman-jungle-guide-8bit.png?v=2",
    label: "Norman 叢林解說人",
    name: "Norman 叢林解說人",
  },
};
const activeCharacter = computed(() => characters[characterId.value]);
const languageSwitchLabel = computed(() => {
  return language.value === "zh" ? "EN" : "中文";
});
const languageSwitchAriaLabel = computed(() => {
  return language.value === "zh"
    ? "切換為英文"
    : "Switch to Traditional Chinese";
});
const nextLanguage = computed<Language>(() => {
  return language.value === "zh" ? "en" : "zh";
});
const sendButtonLabel = computed(() => {
  if (isWorking.value) {
    return copy.value.searching;
  }
  return sendState.value === "success" ? copy.value.sent : copy.value.send;
});
const sendButtonIcon = computed(() => {
  return sendState.value === "success" ? "✓" : "↑";
});
const typingLabel = computed(() => {
  return language.value === "zh"
    ? `${activeCharacter.value.name} 正在查找資料`
    : `${activeCharacter.value.name} is searching for information`;
});
const greeting = computed(() => copy.value.greeting.replace("Mia", activeCharacter.value.name));
const composerPlaceholder = computed(
  () => copy.value.placeholder.replace("Mia", activeCharacter.value.name),
);

function delay(duration: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, duration));
}

function errorDetail(caughtError: unknown, fallback: string): string {
  return caughtError instanceof Error ? caughtError.message : fallback;
}

async function scrollToLatest(): Promise<void> {
  await nextTick();
  messageList.value?.scrollTo({
    behavior: "smooth",
    top: messageList.value.scrollHeight,
  });
}

async function ensureSession(): Promise<string> {
  if (sessionId.value) {
    return sessionId.value;
  }
  const session = await createSession(language.value, providerId.value);
  sessionId.value = session.session_id;
  return session.session_id;
}

async function revealAnswer(message: ChatMessageType, answer: string): Promise<void> {
  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  if (reducedMotion) {
    message.text = answer;
    await scrollToLatest();
    return;
  }

  const characters = Array.from(answer);
  const chunkSize = Math.max(1, Math.ceil(characters.length / 180));
  for (let index = 0; index < characters.length; index += chunkSize) {
    message.text += characters.slice(index, index + chunkSize).join("");
    if (index % (chunkSize * 8) === 0) {
      await scrollToLatest();
    }
    await delay(12);
  }
}

async function ask(rawQuestion?: string): Promise<void> {
  const question = (rawQuestion ?? composer.value).trim();
  if (!question || isWorking.value) {
    return;
  }

  error.value = "";
  sendState.value = "loading";
  composer.value = "";
  messages.value.push({
    id: crypto.randomUUID(),
    role: "user",
    text: question,
  });
  stageState.value = "thinking";
  await scrollToLatest();

  const thinkingStartedAt = performance.now();
  try {
    const activeSessionId = await ensureSession();
    const history = messages.value
      .slice(0, -1)
      .map((item) => ({ content: item.text, role: item.role }));
    const response = await sendMessage(
      activeSessionId,
      question,
      providerId.value,
      history,
    );
    if (response.error) {
      throw new Error(response.error);
    }

    const elapsed = performance.now() - thinkingStartedAt;
    await delay(Math.max(0, MINIMUM_THINKING_TIME_MS - elapsed));

    const assistantMessage = reactive<ChatMessageType>({
      citations: response.citations,
      id: crypto.randomUUID(),
      role: "assistant",
      text: "",
    });
    messages.value.push(assistantMessage);
    stageState.value = "talking";
    await revealAnswer(assistantMessage, response.message);
    sendState.value = "success";
    window.setTimeout(() => {
      if (sendState.value === "success") {
        sendState.value = "default";
      }
    }, SUCCESS_STATE_DURATION_MS);
  } catch (caughtError) {
    const detail = errorDetail(caughtError, "無法取得回答");
    error.value = `${copy.value.searchError}：${detail}`;
    sendState.value = "error";
  } finally {
    stageState.value = "idle";
    await scrollToLatest();
  }
}

function handleComposerKeydown(event: KeyboardEvent): void {
  if (event.key !== "Enter" || event.shiftKey) {
    return;
  }
  event.preventDefault();
  void ask();
}

function resetConversation(): void {
  sessionId.value = "";
  composer.value = "";
  error.value = "";
  sendState.value = "default";
  stageState.value = "idle";
  messages.value = [];
}

async function loadTopics(): Promise<void> {
  categories.value = [];
  isLoadingTopics.value = true;
  topicError.value = "";
  try {
    const response = await fetchTopics(language.value, providerId.value);
    categories.value = response.categories;
  } catch (caughtError) {
    const detail = errorDetail(caughtError, copy.value.topicError);
    topicError.value = `${copy.value.topicError}：${detail}`;
  } finally {
    isLoadingTopics.value = false;
  }
}

async function changeLanguage(nextLanguage: Language): Promise<void> {
  if (nextLanguage === language.value || isWorking.value) {
    return;
  }
  language.value = nextLanguage;
  resetConversation();
  await loadTopics();
}

async function loadRuntimeConfig(): Promise<void> {
  try {
    const response = await fetch("/api/runtime-config");
    if (!response.ok) return;
    const runtime = await response.json() as {
      llm?: {
        defaultProvider?: ProviderId;
        providers?: Array<{
          configured: boolean;
          id: ProviderId;
          label: string;
          model: string;
        }>;
      };
      ui?: { character?: string };
    };
    providerOptions.value = runtime.llm?.providers ?? [];
    const savedProvider = window.localStorage.getItem("nook-provider") as ProviderId | null;
    const selectedProvider = providerOptions.value.find(
      (provider) => provider.id === savedProvider && provider.configured,
    )?.id ?? runtime.llm?.defaultProvider;
    if (selectedProvider) providerId.value = selectedProvider;
    const savedCharacter = window.localStorage.getItem("nook-character");
    if (savedCharacter === "mia" || savedCharacter === "norman") {
      characterId.value = savedCharacter;
      return;
    }
    if (runtime.ui?.character === "mia" || runtime.ui?.character === "norman") {
      characterId.value = runtime.ui.character;
    }
  } catch {
    // The UI remains usable with its built-in default when the API is unavailable.
  }
}

async function loadBingBackground(): Promise<void> {
  try {
    const response = await fetch("/api/background");
    if (!response.ok) return;
    const background = await response.json() as { copyright?: string; url?: string };
    if (!background.url) return;
    const imageUrl = new URL(background.url);
    if (imageUrl.protocol !== "https:" || imageUrl.hostname !== "www.bing.com") return;
    document.body.style.setProperty("--nook-background-image", `url("${imageUrl.href}")`);
    backgroundCredit.value = background.copyright ?? "";
  } catch {
    // Keep the built-in gradient fallback if Bing is temporarily unavailable.
  }
}

onMounted(() => {
  void loadBingBackground();
  void loadRuntimeConfig().then(loadTopics);
});

watch(composer, () => {
  if (sendState.value === "error") {
    error.value = "";
    sendState.value = "default";
  }
});

async function applyAdminSettings(settings: {
  character: CharacterId;
  provider: ProviderId;
}): Promise<void> {
  characterId.value = settings.character;
  providerId.value = settings.provider;
  window.localStorage.setItem("nook-character", settings.character);
  window.localStorage.setItem("nook-provider", providerId.value);
  resetConversation();
  await loadRuntimeConfig();
  await loadTopics();
}

function changeCharacter(): void {
  window.localStorage.setItem("nook-character", characterId.value);
  resetConversation();
}

async function changeProvider(): Promise<void> {
  window.localStorage.setItem("nook-provider", providerId.value);
  resetConversation();
  await loadTopics();
}
</script>

<template>
  <div class="app-shell">
    <header class="topbar">
      <div class="brand">
        <img
          class="brand__avatar"
          :src="activeCharacter.avatar"
          alt=""
          height="256"
          width="256"
        >
        <span>
          <strong>{{ activeCharacter.label }}</strong>
        </span>
      </div>

      <div class="topbar__actions">
        <label class="quick-switch">
          <span class="visually-hidden">切換人偶</span>
          <select v-model="characterId" :disabled="isWorking" @change="changeCharacter">
            <option value="mia">Mia 女角</option>
            <option value="norman">Norman 叢林解說人</option>
          </select>
        </label>
        <label class="quick-switch">
          <span class="visually-hidden">切換 LLM</span>
          <select v-model="providerId" :disabled="isWorking" @change="changeProvider">
            <option
              v-for="provider in providerOptions"
              :key="provider.id"
              :disabled="!provider.configured"
              :value="provider.id"
            >
              {{ provider.label }}{{ provider.configured ? "" : "（未設定）" }}
            </option>
          </select>
        </label>
        <button
          class="admin-button"
          aria-label="開啟 Nook 設定後台"
          title="設定後台"
          type="button"
          @click="isAdminOpen = true"
        >
          <span aria-hidden="true">⚙</span>
        </button>
        <button
          class="reset-button"
          :aria-label="copy.reset"
          :disabled="isWorking"
          :title="copy.reset"
          type="button"
          @click="resetConversation"
        >
          <span aria-hidden="true">↺</span>
        </button>
        <button
          class="language-switch"
          :aria-label="languageSwitchAriaLabel"
          :disabled="isWorking"
          type="button"
          @click="changeLanguage(nextLanguage)"
        >
          <span>{{ languageSwitchLabel }}</span>
        </button>
      </div>
    </header>

    <main class="workspace">
      <section class="chat-panel" :aria-label="copy.chatLabel">
        <div ref="messageList" class="message-list">
          <section class="welcome-card">
            <p class="message__speaker">{{ activeCharacter.name }}</p>
            <p class="welcome-card__copy">
              {{ greeting }}
            </p>
            <TopicRail
              :categories="categories"
              :disabled="isWorking"
              :error="topicError"
              :language="language"
              :loading="isLoadingTopics"
              @ask="ask"
            />
          </section>

          <ChatMessage
            v-for="message in messages"
            :key="message.id"
            :assistant-name="activeCharacter.name"
            :language="language"
            :message="message"
          />

          <div
            v-if="stageState === 'thinking'"
            class="typing"
            :aria-label="typingLabel"
          >
            <i></i>
            <i></i>
            <i></i>
          </div>

          <p v-if="error" class="chat-error" role="alert">
            {{ error }}
          </p>
        </div>

        <form class="composer" @submit.prevent="ask()">
          <label class="composer__field">
            <span class="composer__label">{{ copy.composerLabel }}</span>
            <textarea
              v-model="composer"
              aria-describedby="composer-help"
              :aria-invalid="Boolean(error)"
              :disabled="isWorking"
          :placeholder="composerPlaceholder"
              rows="2"
              @keydown="handleComposerKeydown"
            ></textarea>
          </label>
          <p id="composer-help" class="composer__help">
            {{ copy.composerHelp }}
          </p>
          <button
            class="send-button"
            :aria-busy="sendState === 'loading'"
            :data-state="sendState"
            :disabled="isWorking || !composer.trim()"
            type="submit"
          >
            <span>{{ sendButtonLabel }}</span>
            <span aria-hidden="true">{{ sendButtonIcon }}</span>
          </button>
        </form>
      </section>
    </main>

    <StageCharacter :character="characterId" :language="language" :state="stageState" />
    <a
      v-if="backgroundCredit"
      class="background-credit"
      href="https://www.bing.com"
      rel="noreferrer"
      target="_blank"
    >
      Bing · {{ backgroundCredit }}
    </a>
    <AdminPanel
      v-if="isAdminOpen"
      @close="isAdminOpen = false"
      @saved="applyAdminSettings"
    />
  </div>
</template>
