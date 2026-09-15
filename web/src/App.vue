<script setup lang="ts">
import { ref } from "vue";
import { checkRecord } from "./lib/api";
import { validateCellsLine, validateText } from "./lib/braille";

const text = ref("");
const cells = ref("");
const passed = ref<boolean | null>(null);
const error = ref("");
const busy = ref(false);

async function submit() {
  // 新提交先清除旧结论与旧错误
  passed.value = null;
  error.value = "";

  const textError = validateText(text.value);
  if (textError) {
    error.value = textError;
    return;
  }
  const cellsError = validateCellsLine(cells.value);
  if (cellsError) {
    error.value = cellsError;
    return;
  }

  busy.value = true;
  try {
    passed.value = await checkRecord(text.value, cells.value);
  } catch (e) {
    error.value = e instanceof Error ? e.message : "核对请求失败，请稍后重试";
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <main class="page">
    <h1>门牌盲文点位核对</h1>
    <p class="hint">输入一行门牌文本与一行点位记录（单个空格分隔，空点为 0），整份核对通过或不通过。</p>
    <form class="form" @submit.prevent="submit">
      <label for="text-input">门牌文本</label>
      <input
        id="text-input"
        v-model="text"
        data-testid="text-input"
        placeholder="例如 a1b 2"
        autocomplete="off"
      />
      <label for="cells-input">点位记录</label>
      <input
        id="cells-input"
        v-model="cells"
        data-testid="cells-input"
        placeholder="例如 1 3456 1 12 0 3456 12"
        autocomplete="off"
      />
      <button type="submit" data-testid="submit" :disabled="busy">
        {{ busy ? "核对中…" : "核对" }}
      </button>
    </form>
    <p
      v-if="passed !== null"
      data-testid="verdict"
      role="status"
      :class="['verdict', passed ? 'pass' : 'fail']"
    >
      {{ passed ? "通过" : "不通过" }}
    </p>
    <p v-if="error" data-testid="error" role="alert" class="error">{{ error }}</p>
  </main>
</template>
