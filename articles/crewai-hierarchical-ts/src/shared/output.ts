/**
 * shared/output.ts
 *
 * 输出格式化工具。
 * 统一打印格式，所有步骤共享。
 */

/** 打印分隔线 */
export function separator(title = ""): void {
  console.log("=".repeat(72));
  if (title) console.log(title);
  console.log("=".repeat(72));
}

/** 打印步骤标题 */
export function stepTitle(label: string): void {
  console.log(`\n── ${label} ──\n`);
}

/** 打印对照组输出 */
export function naiveNote(msg: string): void {
  console.log(`  [对照组] ${msg}`);
}

/** 打印调用链 */
export function traceLog(msg: string): void {
  console.log(`  [调用链] ${msg}`);
}

/** 打印工具调用 */
export function toolLog(msg: string): void {
  console.log(`  [工具] ${msg}`);
}

/** 打印执行器信息 */
export function executorLog(msg: string): void {
  console.log(`  [执行器] ${msg}`);
}

/** 打印错误信息 */
export function errorLog(msg: string): void {
  console.log(`  [错误] ${msg}`);
}

/** 打印结论 */
export function conclusion(msg: string): void {
  console.log(`  🎯 ${msg}`);
}

export {};
export default undefined;
