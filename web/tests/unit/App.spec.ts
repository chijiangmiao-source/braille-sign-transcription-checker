import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "../../src/App.vue";
import { checkRecord } from "../../src/lib/api";

vi.mock("../../src/lib/api", () => ({
  CheckError: class CheckError extends Error {},
  checkRecord: vi.fn(),
}));

const mockedCheckRecord = vi.mocked(checkRecord);

async function fillAndSubmit(text: string, cells: string) {
  const wrapper = mount(App);
  await wrapper.get('[data-testid="text-input"]').setValue(text);
  await wrapper.get('[data-testid="cells-input"]').setValue(cells);
  await wrapper.get('[data-testid="submit"]').trigger("submit");
  await flushPromises();
  return wrapper;
}

describe("App", () => {
  beforeEach(() => {
    mockedCheckRecord.mockReset();
  });

  it("整份通过显示通过", async () => {
    mockedCheckRecord.mockResolvedValue(true);
    const wrapper = await fillAndSubmit("a1b 2", "1 3456 1 12 0 3456 12");
    expect(wrapper.get('[data-testid="verdict"]').text()).toBe("通过");
    expect(wrapper.find('[data-testid="error"]').exists()).toBe(false);
  });

  it("整份不通过显示不通过", async () => {
    mockedCheckRecord.mockResolvedValue(false);
    const wrapper = await fillAndSubmit("a1b 2", "1 3456 1 12 0 3456 1");
    expect(wrapper.get('[data-testid="verdict"]').text()).toBe("不通过");
  });

  it("格式非法时显示明确错误且不发起请求", async () => {
    const wrapper = await fillAndSubmit("Abc", "1");
    expect(mockedCheckRecord).not.toHaveBeenCalled();
    expect(wrapper.get('[data-testid="error"]').text()).toContain("小写");
    expect(wrapper.find('[data-testid="verdict"]').exists()).toBe(false);
  });

  it("点位格式非法时显示明确错误", async () => {
    const wrapper = await fillAndSubmit("a1", "1 3456 21");
    expect(mockedCheckRecord).not.toHaveBeenCalled();
    expect(wrapper.get('[data-testid="error"]').text()).toContain("点位单元格式不正确");
  });

  it("请求失败时显示明确错误", async () => {
    mockedCheckRecord.mockRejectedValue(new Error("无法连接核对服务，请检查网络后重试"));
    const wrapper = await fillAndSubmit("a1", "1 3456 1");
    expect(wrapper.get('[data-testid="error"]').text()).toContain("无法连接核对服务");
    expect(wrapper.find('[data-testid="verdict"]').exists()).toBe(false);
  });

  it("新提交清除旧结论", async () => {
    mockedCheckRecord.mockResolvedValue(true);
    const wrapper = await fillAndSubmit("a1", "1 3456 1");
    expect(wrapper.get('[data-testid="verdict"]').text()).toBe("通过");

    // 再次提交非法输入：旧结论被清除，显示错误
    await wrapper.get('[data-testid="text-input"]').setValue("a  b");
    await wrapper.get('[data-testid="submit"]').trigger("submit");
    await flushPromises();
    expect(wrapper.find('[data-testid="verdict"]').exists()).toBe(false);
    expect(wrapper.get('[data-testid="error"]').text()).toContain("连续空格");

    // 再次提交合法输入：旧错误被清除，显示新结论
    mockedCheckRecord.mockResolvedValue(false);
    await wrapper.get('[data-testid="text-input"]').setValue("a1");
    await wrapper.get('[data-testid="cells-input"]').setValue("1 3456 12");
    await wrapper.get('[data-testid="submit"]').trigger("submit");
    await flushPromises();
    expect(wrapper.find('[data-testid="error"]').exists()).toBe(false);
    expect(wrapper.get('[data-testid="verdict"]').text()).toBe("不通过");
  });
});
