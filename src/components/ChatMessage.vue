<script setup lang="ts">
import { computed } from "vue";

import type { ChatMessage, Citation, Language } from "../types";

const props = defineProps<{
  language: Language;
  message: ChatMessage;
}>();

const citedIndexes = computed(() => {
  const indexes = new Set<number>();
  for (const match of props.message.text.matchAll(/\[(\d+)]/g)) {
    indexes.add(Number(match[1]));
  }
  return indexes;
});
const speakerName = computed(() => {
  if (props.message.role === "assistant") {
    return "Mia";
  }
  return props.language === "zh" ? "你" : "You";
});

function citationTitle(citation: Citation, index: number): string {
  return citation.title
    ?? citation.name
    ?? citation.filename
    ?? citation.uri
    ?? `資料來源 ${index + 1}`;
}

function citationSummary(citation: Citation): string {
  return citation.summary ?? citation.text ?? "";
}

function isCitationHighlighted(index: number): boolean {
  return citedIndexes.value.has(index + 1)
    || (citedIndexes.value.size === 0 && index === 0);
}

</script>

<template>
  <article
    class="message"
    :class="`message--${message.role}`"
  >
    <p class="message__speaker">{{ speakerName }}</p>
    <div class="message__bubble">
      <p class="message__text">{{ message.text }}</p>
    </div>

    <div
      v-if="message.citations?.length"
      class="citation-list"
      aria-label="回答引用"
    >
      <div
        v-for="(citation, index) in message.citations"
        :key="`${citationTitle(citation, index)}-${index}`"
        class="citation"
        :class="{ 'citation--hot': isCitationHighlighted(index) }"
      >
        <span class="citation__index">[{{ index + 1 }}]</span>
        <span>
          <strong>{{ citationTitle(citation, index) }}</strong>
          <small v-if="citationSummary(citation)">
            {{ citationSummary(citation) }}
          </small>
        </span>
      </div>
    </div>
  </article>
</template>
