<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue";

import type { CharacterId, Language, StageState } from "../types";

const props = defineProps<{
  character: CharacterId;
  language: Language;
  state: StageState;
}>();

const characterImages: Record<CharacterId, Record<StageState, string[]>> = {
  mia: {
    idle: ["/nook-guide/avatars/mia/mia-idle.png?v=4"],
    talking: [
      "/nook-guide/avatars/mia/mia-talking-1.png?v=4",
      "/nook-guide/avatars/mia/mia-talking-2.png?v=4",
      "/nook-guide/avatars/mia/mia-idle.png?v=4",
    ],
    thinking: [
      "/nook-guide/avatars/mia/mia-thinking-1.png?v=4",
      "/nook-guide/avatars/mia/mia-thinking-2.png?v=4",
      "/nook-guide/avatars/mia/mia-thinking-3.png?v=4",
    ],
  },
  norman: {
    idle: ["/nook-guide/avatars/norman/norman-jungle-guide-8bit.png?v=2"],
    talking: ["/nook-guide/avatars/norman/norman-jungle-guide-8bit.png?v=2"],
    thinking: ["/nook-guide/avatars/norman/norman-jungle-guide-8bit.png?v=2"],
  },
};
const ALT_TEXT: Record<CharacterId, Record<Language, string>> = {
  mia: {
    en: "Mia is helping with the answer",
    zh: "Mia 正在協助回答",
  },
  norman: {
    en: "Norman, the jungle guide, is helping with the answer",
    zh: "Norman 叢林解說人正在協助回答",
  },
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

const preloadImages = Object.values(characterImages).flatMap((states) => Object.values(states).flat());

function preloadImage(source: string): void {
  const image = new Image();
  image.src = source;
}

preloadImages.forEach(preloadImage);

const currentSource = ref(characterImages.mia.idle[0]);
let actionTimer: ReturnType<typeof setTimeout> | undefined;

const altText = computed(() => ALT_TEXT[props.character][props.language]);
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

function idleImage(): string {
  return characterImages[props.character].idle[0];
}

function playRandomAction(state: Exclude<StageState, "idle">): void {
  const actionImages = characterImages[props.character][state];
  const candidates = actionImages.filter(
    (source) => source !== currentSource.value,
  );
  const nextIndex = Math.floor(Math.random() * candidates.length);
  currentSource.value = candidates[nextIndex] ?? actionImages[0];
  actionTimer = window.setTimeout(
    () => playRandomAction(state),
    actionInterval(state),
  );
}

watch(
  [() => props.state, () => props.character],
  ([state]) => {
    clearActionTimer();
    if (state === "idle") {
      currentSource.value = idleImage();
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
