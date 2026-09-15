<script setup lang="ts">
import { ref, watch } from "vue";
import { checkRecord, fetchUsage, type UsageStats } from "./lib/api";
import { validateCellsLine, validateText } from "./lib/braille";

const text = ref("");
const cells = ref("");
const passed = ref<boolean | null>(null);
const error = ref("");
const busy = ref(false);

const usage = ref<UsageStats | null>(null);
const usageError = ref("");
const usageBusy = ref(false);

// 门牌文本一旦被修改，旧用量立即失效
watch(text, () => {
  usage.value = null;
  usageError.value = "";
});

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

async function recount() {
  // 再次核算先清除旧用量与旧用量错误；不触碰已有核对结论
  usage.value = null;
  usageError.value = "";

  const textError = validateText(text.value);
  if (textError) {
    usageError.value = textError;
    return;
  }

  usageBusy.value = true;
  try {
    usage.value = await fetchUsage(text.value);
  } catch (e) {
    usageError.value = e instanceof Error ? e.message : "用量核算失败，请稍后重试";
  } finally {
    usageBusy.value = false;
  }
}
</script>

<template>
  <main class="page">
    <h1>门牌盲文点位核对</h1>
    <p class="hint">
      输入一行门牌文本与一行点位记录（单个空格分隔，空点为 0），整份核对通过或不通过；压印前可只填门牌文本核算用量。
    </p>
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
      <div class="actions">
        <button type="submit" data-testid="submit" :disabled="busy">
          {{ busy ? "核对中…" : "核对" }}
        </button>
        <button
          type="button"
          class="secondary"
          data-testid="usage-submit"
          :disabled="usageBusy"
          @click="recount"
        >
          {{ usageBusy ? "核算中…" : "核算用量" }}
        </button>
      </div>
    </form>
    <section v-if="usage" class="usage" data-testid="usage" aria-label="用量核算结果">
      <h2>用量核算</h2>
      <ul>
        <li data-testid="usage-cells">单元总数：{{ usage.cells }}</li>
        <li data-testid="usage-dots">凸点总数：{{ usage.dots }}</li>
        <li data-testid="usage-empty">空点数：{{ usage.empty_cells }}</li>
        <li data-testid="usage-number-signs">数字号数：{{ usage.number_signs }}</li>
      </ul>
    </section>
    <p v-if="usageError" data-testid="usage-error" role="alert" class="error">{{ usageError }}</p>
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
