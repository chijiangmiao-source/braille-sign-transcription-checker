import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "../../src/App.vue";
import { checkRecord, fetchUsage, type UsageStats } from "../../src/lib/api";

vi.mock("../../src/lib/api", () => ({
  CheckError: class CheckError extends Error {},
  checkRecord: vi.fn(),
  fetchUsage: vi.fn(),
}));

const mockedCheckRecord = vi.mocked(checkRecord);
const mockedFetchUsage = vi.mocked(fetchUsage);

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
    mockedFetchUsage.mockReset();
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

describe("App 核算用量", () => {
  beforeEach(() => {
    mockedCheckRecord.mockReset();
    mockedFetchUsage.mockReset();
  });

  async function fillAndRecount(text: string) {
    const wrapper = mount(App);
    await wrapper.get('[data-testid="text-input"]').setValue(text);
    await wrapper.get('[data-testid="usage-submit"]').trigger("click");
    await flushPromises();
    return wrapper;
  }

  it("普通字母门牌显示四项统计", async () => {
    mockedFetchUsage.mockResolvedValue({ cells: 3, dots: 5, empty_cells: 0, number_signs: 0 });
    const wrapper = await fillAndRecount("abc");
    expect(mockedFetchUsage).toHaveBeenCalledWith("abc");
    expect(wrapper.get('[data-testid="usage-cells"]').text()).toBe("单元总数：3");
    expect(wrapper.get('[data-testid="usage-dots"]').text()).toBe("凸点总数：5");
    expect(wrapper.get('[data-testid="usage-empty"]').text()).toBe("空点数：0");
    expect(wrapper.get('[data-testid="usage-number-signs"]').text()).toBe("数字号数：0");
    expect(wrapper.find('[data-testid="usage-error"]').exists()).toBe(false);
  });

  it("含连续数字和空格的门牌显示统计", async () => {
    mockedFetchUsage.mockResolvedValue({ cells: 6, dots: 10, empty_cells: 1, number_signs: 1 });
    const wrapper = await fillAndRecount("ab 12");
    expect(wrapper.get('[data-testid="usage-cells"]').text()).toBe("单元总数：6");
    expect(wrapper.get('[data-testid="usage-dots"]').text()).toBe("凸点总数：10");
    expect(wrapper.get('[data-testid="usage-empty"]').text()).toBe("空点数：1");
    expect(wrapper.get('[data-testid="usage-number-signs"]').text()).toBe("数字号数：1");
  });

  it("修改门牌文本后清除旧用量", async () => {
    mockedFetchUsage.mockResolvedValue({ cells: 3, dots: 5, empty_cells: 0, number_signs: 0 });
    const wrapper = await fillAndRecount("abc");
    expect(wrapper.find('[data-testid="usage"]').exists()).toBe(true);

    await wrapper.get('[data-testid="text-input"]').setValue("abcd");
    expect(wrapper.find('[data-testid="usage"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="usage-error"]').exists()).toBe(false);
  });

  it("再次核算时清除旧用量", async () => {
    mockedFetchUsage.mockResolvedValueOnce({ cells: 3, dots: 5, empty_cells: 0, number_signs: 0 });
    const wrapper = await fillAndRecount("abc");
    expect(wrapper.get('[data-testid="usage-cells"]').text()).toBe("单元总数：3");

    let resolveSecond: (value: UsageStats) => void = () => {};
    mockedFetchUsage.mockImplementationOnce(
      () => new Promise<UsageStats>((resolve) => { resolveSecond = resolve; }),
    );
    await wrapper.get('[data-testid="usage-submit"]').trigger("click");
    // 核算未完成期间旧用量已被清除
    expect(wrapper.find('[data-testid="usage"]').exists()).toBe(false);

    resolveSecond({ cells: 4, dots: 6, empty_cells: 0, number_signs: 0 });
    await flushPromises();
    expect(wrapper.get('[data-testid="usage-cells"]').text()).toBe("单元总数：4");
  });

  it("非法文本后旧用量被清除，错误显示在用量区域且不发起请求", async () => {
    mockedFetchUsage.mockResolvedValue({ cells: 3, dots: 5, empty_cells: 0, number_signs: 0 });
    const wrapper = await fillAndRecount("abc");
    expect(wrapper.find('[data-testid="usage"]').exists()).toBe(true);

    await wrapper.get('[data-testid="text-input"]').setValue("Abc");
    await wrapper.get('[data-testid="usage-submit"]').trigger("click");
    await flushPromises();
    expect(mockedFetchUsage).toHaveBeenCalledTimes(1);
    expect(wrapper.find('[data-testid="usage"]').exists()).toBe(false);
    expect(wrapper.get('[data-testid="usage-error"]').text()).toContain("小写");
  });

  it("核算请求返回前修改门牌文本，过期结果被丢弃且用量保持清空", async () => {
    let resolveUsage: (value: UsageStats) => void = () => {};
    mockedFetchUsage.mockImplementation(
      () => new Promise<UsageStats>((resolve) => { resolveUsage = resolve; }),
    );
    const wrapper = mount(App);
    await wrapper.get('[data-testid="text-input"]').setValue("abc");
    await wrapper.get('[data-testid="usage-submit"]').trigger("click");

    // 请求在途期间修改门牌文本
    await wrapper.get('[data-testid="text-input"]').setValue("abcd");
    resolveUsage({ cells: 3, dots: 5, empty_cells: 0, number_signs: 0 });
    await flushPromises();

    expect(wrapper.find('[data-testid="usage"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="usage-error"]').exists()).toBe(false);
    expect(wrapper.get('[data-testid="usage-submit"]').attributes("disabled")).toBeUndefined();
  });

  it("核算请求返回前修改门牌文本，过期失败信息同样被丢弃", async () => {
    let rejectUsage: (reason: unknown) => void = () => {};
    mockedFetchUsage.mockImplementation(
      () => new Promise<UsageStats>((_resolve, reject) => { rejectUsage = reject; }),
    );
    const wrapper = mount(App);
    await wrapper.get('[data-testid="text-input"]').setValue("abc");
    await wrapper.get('[data-testid="usage-submit"]').trigger("click");

    await wrapper.get('[data-testid="text-input"]').setValue("abcd");
    rejectUsage(new Error("无法连接核算服务，请检查网络后重试"));
    await flushPromises();

    expect(wrapper.find('[data-testid="usage"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="usage-error"]').exists()).toBe(false);
  });

  it("核算期间禁用核算按钮但不阻止编辑点位记录", async () => {
    let resolveUsage: (value: UsageStats) => void = () => {};
    mockedFetchUsage.mockImplementation(
      () => new Promise<UsageStats>((resolve) => { resolveUsage = resolve; }),
    );
    const wrapper = mount(App);
    await wrapper.get('[data-testid="text-input"]').setValue("abc");
    await wrapper.get('[data-testid="usage-submit"]').trigger("click");

    expect(wrapper.get('[data-testid="usage-submit"]').attributes("disabled")).toBeDefined();
    const cellsInput = wrapper.get('[data-testid="cells-input"]');
    expect(cellsInput.attributes("disabled")).toBeUndefined();
    await cellsInput.setValue("1 12 14");
    expect((cellsInput.element as HTMLInputElement).value).toBe("1 12 14");

    resolveUsage({ cells: 3, dots: 5, empty_cells: 0, number_signs: 0 });
    await flushPromises();
    expect(wrapper.get('[data-testid="usage-submit"]').attributes("disabled")).toBeUndefined();
    expect(wrapper.get('[data-testid="usage-cells"]').text()).toBe("单元总数：3");
  });

  it("核算异常显示在用量区域且不覆盖已有核对结论", async () => {
    mockedCheckRecord.mockResolvedValue(true);
    const wrapper = await fillAndSubmit("a1", "1 3456 1");
    expect(wrapper.get('[data-testid="verdict"]').text()).toBe("通过");

    mockedFetchUsage.mockRejectedValue(new Error("无法连接核算服务，请检查网络后重试"));
    await wrapper.get('[data-testid="usage-submit"]').trigger("click");
    await flushPromises();
    expect(wrapper.get('[data-testid="usage-error"]').text()).toContain("无法连接核算服务");
    expect(wrapper.find('[data-testid="usage"]').exists()).toBe(false);
    expect(wrapper.get('[data-testid="verdict"]').text()).toBe("通过");
    expect(wrapper.find('[data-testid="error"]').exists()).toBe(false);
  });

  it("完成用量核算后仍可按原方式提交点位记录并得到通过或不通过", async () => {
    mockedFetchUsage.mockResolvedValue({ cells: 7, dots: 14, empty_cells: 1, number_signs: 2 });
    mockedCheckRecord.mockResolvedValue(true);
    const wrapper = mount(App);
    await wrapper.get('[data-testid="text-input"]').setValue("a1b 2");
    await wrapper.get('[data-testid="usage-submit"]').trigger("click");
    await flushPromises();
    expect(wrapper.find('[data-testid="usage"]').exists()).toBe(true);

    await wrapper.get('[data-testid="cells-input"]').setValue("1 3456 1 12 0 3456 12");
    await wrapper.get('[data-testid="submit"]').trigger("submit");
    await flushPromises();
    expect(wrapper.get('[data-testid="verdict"]').text()).toBe("通过");

    mockedCheckRecord.mockResolvedValue(false);
    await wrapper.get('[data-testid="cells-input"]').setValue("1 3456 1 12 0 3456 1");
    await wrapper.get('[data-testid="submit"]').trigger("submit");
    await flushPromises();
    expect(wrapper.get('[data-testid="verdict"]').text()).toBe("不通过");
  });
});
