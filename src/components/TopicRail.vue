<script setup lang="ts">
import { computed } from "vue";

import type { Language, TopicCategory } from "../types";

const props = defineProps<{
  categories: TopicCategory[];
  disabled: boolean;
  error: string;
  language: Language;
  loading: boolean;
}>();

const emit = defineEmits<{
  ask: [question: string];
}>();

const VISIBLE_QUESTION_LIMIT = 6;

function collectUniqueQuestions(categories: TopicCategory[]): string[] {
  const uniqueQuestions = new Set<string>();
  for (const category of categories) {
    for (const topic of category.topics) {
      for (const question of topic.questions) {
        uniqueQuestions.add(question);
      }
    }
  }
  return [...uniqueQuestions];
}

function shuffleQuestions(questions: string[]): string[] {
  const shuffled = [...questions];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const targetIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[targetIndex]] = [
      shuffled[targetIndex],
      shuffled[index],
    ];
  }
  return shuffled;
}

const emptyMessage = computed(() => {
  if (props.language === "zh") {
    return "目前沒有預設問題，仍可自由輸入。";
  }
  return "No quick questions are available. You can still ask freely.";
});

const questions = computed(() => {
  const uniqueQuestions = collectUniqueQuestions(props.categories);
  return shuffleQuestions(uniqueQuestions).slice(0, VISIBLE_QUESTION_LIMIT);
});
</script>

<template>
  <aside class="topic-rail" aria-label="ESG 快速問答">

    <p v-if="error" class="topic-rail__error" role="status">
      {{ error }}
    </p>

    <div class="question-list">
      <button
        v-for="question in questions"
        :key="question"
        class="quick-question"
        :disabled="disabled"
        type="button"
        @click="emit('ask', question)"
      >
        <span>{{ question }}</span>
      </button>
      <p
        v-if="!loading && !questions.length"
        class="question-list__empty"
      >
        {{ emptyMessage }}
      </p>
    </div>
  </aside>
</template>
