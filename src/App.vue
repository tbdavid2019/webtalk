<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref, watch } from "vue";

import ChatMessage from "./components/ChatMessage.vue";
import StageCharacter from "./components/StageCharacter.vue";
import TopicRail from "./components/TopicRail.vue";
import { createSession, fetchTopics, sendMessage } from "./services/esgApi";
import type {
  ChatMessage as ChatMessageType,
  Language,
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
    chatLabel: "ESG conversation",
    composerHelp: "Enter to send · Shift + Enter for a new line",
    composerLabel: "Your question",
    greeting: "Hi, I’m AIKKA. Choose a quick ESG question or ask me anything.",
    placeholder: "For example: How should a company assess Scope 3 emissions?",
    reset: "Reset",
    searchError: "The chat API could not complete the request",
    searching: "Searching",
    send: "Send",
    sent: "Done",
    topicError: "Topics are temporarily unavailable",
  },
  zh: {
    chatLabel: "ESG 對話",
    composerHelp: "Enter 送出 · Shift + Enter 換行",
    composerLabel: "你的問題",
    greeting: "嗨，我是 AIKKA。想了解什麼與三立ESG的資訊嗎？跟我說，我幫你找。",
    placeholder: "想知道甚麼？跟AIKKA說",
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
const composer = ref("");
const error = ref("");
const isLoadingTopics = ref(true);
const language = ref<Language>("zh");
const messages = ref<ChatMessageType[]>([]);
const messageList = ref<HTMLElement>();
const githubUrl = import.meta.env.VITE_GITHUB_URL?.trim() ?? "";
const sendState = ref<SendState>("default");
const sessionId = ref("");
const stageState = ref<StageState>("idle");
const topicError = ref("");

const isWorking = computed(() => stageState.value !== "idle");
const copy = computed(() => COPY_BY_LANGUAGE[language.value]);
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
    ? "AIKKA 正在查找資料"
    : "AIKKA is searching for information";
});

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
  const session = await createSession(language.value);
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
    const response = await sendMessage(activeSessionId, question);
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
    const response = await fetchTopics(language.value);
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

onMounted(loadTopics);

watch(composer, () => {
  if (sendState.value === "error") {
    error.value = "";
    sendState.value = "default";
  }
});
</script>

<template>
  <div class="app-shell">
    <header class="topbar">
      <div class="brand">
        <img
          class="brand__avatar"
          src="/nook-guide/aikka-avatar.png?v=3"
          alt=""
          height="256"
          width="256"
        >
        <span>
          <strong>AIKKA</strong>
        </span>
      </div>

      <div class="topbar__actions">
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
        <a
          class="build-credit"
          aria-label="Built with CSL"
          :aria-disabled="!githubUrl"
          :href="githubUrl || undefined"
          :rel="githubUrl ? 'noreferrer' : undefined"
          :tabindex="githubUrl ? undefined : -1"
          :target="githubUrl ? '_blank' : undefined"
          :title="
            githubUrl
              ? 'Open CreateIntelligens on GitHub'
              : 'GitHub URL is not configured'
          "
        >
          <span class="build-credit__copy">
            <strong>Built with</strong>
            <small>CSL</small>
          </span>
          <img
            class="build-credit__avatar"
            src="/nook-guide/csl-avatar.png?v=1"
            alt=""
            height="256"
            width="256"
          >
        </a>
      </div>
    </header>

    <main class="workspace">
      <section class="chat-panel" :aria-label="copy.chatLabel">
        <div ref="messageList" class="message-list">
          <section class="welcome-card">
            <p class="message__speaker">AIKKA</p>
            <p class="welcome-card__copy">
              {{ copy.greeting }}
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
              :placeholder="copy.placeholder"
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

    <StageCharacter :language="language" :state="stageState" />
  </div>
</template>
