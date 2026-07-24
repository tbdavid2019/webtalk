<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue";

import type { Language, StageState } from "../types";

const props = defineProps<{
  language: Language;
  state: StageState;
}>();

const idleImage = "/nook-guide/aikka-idle.png?v=3";
const actionImages: Record<Exclude<StageState, "idle">, string[]> = {
  talking: [
    "/nook-guide/aikka-talking-1.png?v=3",
    "/nook-guide/aikka-talking-2.png?v=3",
    "/nook-guide/aikka-idle.png?v=3",
  ],
  thinking: [
    "/nook-guide/aikka-thinking-1.png?v=3",
    "/nook-guide/aikka-thinking-2.png?v=3",
    "/nook-guide/aikka-thinking-3.png?v=3",
  ],
};
const ALT_TEXT: Record<Language, string> = {
  en: "AIKKA virtual guide is helping with the answer",
  zh: "AIKKA 虛擬顧問正在協助回答",
};
const STATUS_TEXT: Record<Language, Record<StageState, string>> = {
  en: {
    idle: "ready",
    talking: "explaining",
    thinking: "searching…",
  },
  zh: {
    idle: "待命中",
    talking: "說明中",
    thinking: "查找中…",
  },
};

const preloadImages = [
  idleImage,
  ...actionImages.talking,
  ...actionImages.thinking,
];

function preloadImage(source: string): void {
  const image = new Image();
  image.src = source;
}

preloadImages.forEach(preloadImage);

const currentSource = ref(idleImage);
let actionTimer: ReturnType<typeof setTimeout> | undefined;

const altText = computed(() => ALT_TEXT[props.language]);
const statusText = computed(
  () => STATUS_TEXT[props.language][props.state],
);

function clearActionTimer(): void {
  if (actionTimer) {
    window.clearTimeout(actionTimer);
    actionTimer = undefined;
  }
}

function actionInterval(state: Exclude<StageState, "idle">): number {
  if (state === "thinking") {
    return 1100 + Math.random() * 900;
  }
  return 220 + Math.random() * 200;
}

function playRandomAction(state: Exclude<StageState, "idle">): void {
  const candidates = actionImages[state].filter(
    (source) => source !== currentSource.value,
  );
  const nextIndex = Math.floor(Math.random() * candidates.length);
  currentSource.value = candidates[nextIndex] ?? actionImages[state][0];
  actionTimer = window.setTimeout(
    () => playRandomAction(state),
    actionInterval(state),
  );
}

watch(
  () => props.state,
  (state) => {
    clearActionTimer();
    if (state === "idle") {
      currentSource.value = idleImage;
      return;
    }
    playRandomAction(state);
  },
  { immediate: true },
);

onBeforeUnmount(clearActionTimer);
</script>

<template>
  <aside
    id="stage"
    :class="{ working: state !== 'idle' }"
    aria-live="polite"
  >
    <div class="stage__frame">
      <img
        :src="currentSource"
        :alt="altText"
        height="1664"
        width="1024"
      >
    </div>
    <div class="stage__plate">{{ statusText }}</div>
  </aside>
</template>
