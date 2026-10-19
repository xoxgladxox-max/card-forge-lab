// tests/backup.test.mjs — build 备份逻辑回归
// 覆盖：全新工程二次构建、同次构建共享备份目录、快速连续构建不覆盖、备份失败不静默
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { buildCmd } from '../src/cmd/build.mjs';
import { copyProject } from './helpers.mjs';

const EXAMPLE = path.resolve('examples/meta-template');

// 复制示例卡并清掉所有派生物，模拟从未构建过的全新工程
async function freshProject() {
  const tmp = await copyProject(EXAMPLE);
  await fs.rm(path.join(tmp, 'backups'), { recursive: true, force: true });
  await fs.rm(path.join(tmp, 'dist'), { recursive: true, force: true });
  await fs.rm(path.join(tmp, '.card-forge'), { recursive: true, force: true });
  return tmp;
}

test('备份：全新工程没有 backups/ 时，重复构建正常备份', async () => {
  const tmp = await freshProject();
  const r1 = await buildCmd(tmp);
  assert.ok(r1.ok, r1.report);
  // 首次构建无旧文件，不应产生备份目录
  assert.deepEqual(await fs.readdir(path.join(tmp, 'backups')).catch(() => []), []);
  const r2 = await buildCmd(tmp);
  assert.ok(r2.ok, r2.report);
  const dirs = await fs.readdir(path.join(tmp, 'backups'));
  assert.equal(dirs.length, 1, '第二次构建应产生一个备份目录');
});

test('备份：同一次构建的 json/txt 放进同一备份目录', async () => {
  const tmp = await freshProject();
  await buildCmd(tmp);
  await buildCmd(tmp);
  const dirs = await fs.readdir(path.join(tmp, 'backups'));
  assert.equal(dirs.length, 1);
  const files = (await fs.readdir(path.join(tmp, 'backups', dirs[0]))).sort();
  assert.deepEqual(files, ['元提示词模板.json', '元提示词模板.txt']);
});

test('备份：快速连续构建不覆盖旧备份', async () => {
  const tmp = await freshProject();
  await buildCmd(tmp);
  await buildCmd(tmp);
  const first = (await fs.readdir(path.join(tmp, 'backups')))[0];
  const firstJson = await fs.readFile(path.join(tmp, 'backups', first, '元提示词模板.json'), 'utf8');
  // 立刻再构建两次，间隔可能落在同一毫秒
  await buildCmd(tmp);
  await buildCmd(tmp);
  const dirs = await fs.readdir(path.join(tmp, 'backups'));
  assert.equal(dirs.length, 3, `三次有旧文件的构建应各自独立备份，实际：${dirs.join(', ')}`);
  // 旧备份内容未被后续构建覆盖
  assert.equal(await fs.readFile(path.join(tmp, 'backups', first, '元提示词模板.json'), 'utf8'), firstJson);
});

test('备份：备份目录创建失败必须报错，不得静默继续', async () => {
  const tmp = await freshProject();
  await buildCmd(tmp); // 产生 dist 旧文件
  // 用同名文件挡住 backups/ 目录创建（模拟权限/磁盘类故障）
  await fs.writeFile(path.join(tmp, 'backups'), 'blocked', 'utf8');
  await assert.rejects(() => buildCmd(tmp));
  // 旧成品未被覆盖（备份失败发生在写入之前）
  const dist = await fs.readFile(path.join(tmp, 'dist', '元提示词模板.json'), 'utf8');
  assert.ok(dist.includes('chara_card_v2'));
});
