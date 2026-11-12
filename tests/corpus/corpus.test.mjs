import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, symlink, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { repoPath } from '../e2e/paths.mjs';

const tooling = () => import('../../scripts/corpus.mjs');
const temporary = () => mkdtemp(join(tmpdir(), 'converter-corpus-unit-'));
const sample = { cases: [{ id: 'local-example', source: './private/input.pptx', referencePDF: './private/office.pdf' }] };
async function manifest(value, dir) {
  dir ??= await temporary();
  const path = join(dir, 'manifest.json');
  await writeFile(path, JSON.stringify(value));
  return path;
}

test('manifest paths resolve relative to the manifest, not the working directory', async () => {
  const { loadManifest } = await tooling();
  const dir = await temporary();
  const result = await loadManifest(await manifest(sample, dir));
  assert.equal(result.cases[0].source, join(dir, 'private', 'input.pptx'));
  assert.equal(result.cases[0].referencePDF, join(dir, 'private', 'office.pdf'));
  assert.deepEqual(result.cases[0].thresholds, { ssim: .93, foregroundIoU: .8 });
});

test('empty, template, unsupported, duplicate, and invalid-threshold manifests fail clearly', async () => {
  const { loadManifest } = await tooling();
  for (const value of [{}, { cases: [] }, { ...sample, template: true },
    { cases: [{ source: '<LOCAL_SOURCE.pptx>', referencePDF: '<OFFICE_REFERENCE.pdf>' }] },
    { cases: [{ source: 'input.doc', referencePDF: 'ref.pdf' }] },
    { cases: [{ source: 'input.docx' }] },
    { cases: [sample.cases[0], sample.cases[0]] },
    { ...sample, thresholds: { ssim: 1.1 } },
    { ...sample, thresholds: { foregroundIoU: '0.8' } },
    { ...sample, cases: [{ ...sample.cases[0], expectedPages: 0 }] }]) {
    await assert.rejects(loadManifest(await manifest(value)), /manifest|template|threshold|case|page|source|reference/i);
  }
});

test('per-case thresholds override global thresholds without losing defaults', async () => {
  const { loadManifest } = await tooling();
  const result = await loadManifest(await manifest({ thresholds: { ssim: .95, textCoverage: .7 },
    cases: [{ ...sample.cases[0], thresholds: { foregroundIoU: .9 } }] }));
  assert.deepEqual(result.cases[0].thresholds, { ssim: .95, foregroundIoU: .9, textCoverage: .7 });
});

test('configured real filenames are not mistaken for placeholder prose', async () => {
  const { loadManifest } = await tooling();
  const result = await loadManifest(await manifest({ cases: [{ source: './private/replacement-policy.docx', referencePDF: './private/replacement-policy.pdf' }] }));
  assert.ok(result.cases[0].source.endsWith('replacement-policy.docx'));
});

test('short iou threshold name is accepted and invalid conflicts are rejected', async () => {
  const { loadManifest } = await tooling();
  const result = await loadManifest(await manifest({ ...sample, thresholds: { iou: .85 } }));
  assert.equal(result.cases[0].thresholds.foregroundIoU, .85);
  await assert.rejects(loadManifest(await manifest({ ...sample, thresholds: { iou: .85, foregroundIoU: .9 } })), /conflict/i);
});

test('streaming SHA-256 records the actual file bytes', async () => {
  const { sha256File } = await tooling();
  const file = join(await temporary(), 'source.bin');
  await writeFile(file, 'abc');
  assert.equal(await sha256File(file), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
});

test('output inside the repository is rejected before making a directory', async () => {
  const { prepareOutput } = await tooling();
  await assert.rejects(prepareOutput(repoPath('tests', 'corpus', 'private-results')), /outside|external/i);
  const root = await temporary();
  const output = await prepareOutput(root);
  assert.ok(output.startsWith(root));
  const second = await prepareOutput(root);
  assert.notEqual(output, second, 'runs must not overwrite prior evidence');
});

test('an external junction or symlink into the repository cannot receive private output', async () => {
  const { prepareOutput } = await tooling();
  const link = join(await temporary(), 'repo-link');
  await symlink(repoPath(), link, process.platform === 'win32' ? 'junction' : 'dir');
  try { await assert.rejects(prepareOutput(join(link, 'tests', 'corpus', 'private-results')), /outside|external/i); }
  finally { await unlink(link); }
});

test('missing source/reference errors are reported without claiming a real-file pass', async () => {
  const { runCorpus } = await tooling();
  const dir = await temporary();
  const result = await runCorpus({ manifestPath: await manifest(sample, dir), outputDir: join(dir, 'results') });
  assert.equal(result.report.pass, false);
  assert.equal(result.report.summary.passed, 0);
  assert.equal(result.report.cases[0].errors[0].stage, 'input');
  assert.ok(result.report.cases[0].source.path.endsWith('input.pptx'));
  const saved = JSON.parse(await readFile(result.reportPath, 'utf8'));
  assert.equal(saved.pass, false);
  assert.ok('revision' in saved.converter);
});

test('CLI rejects empty manifests and repository output with nonzero status', async () => {
  const dir = await temporary();
  for (const [manifestPath, outputDir] of [[await manifest({ cases: [] }, dir), join(dir, 'results')],
    [await manifest(sample, await temporary()), repoPath('tests', 'corpus', 'not-private')]]) {
    const run = spawnSync(process.execPath, [repoPath('scripts', 'corpus.mjs'), '--manifest', manifestPath, '--output', outputDir], { encoding: 'utf8' });
    assert.notEqual(run.status, 0);
    assert.match(run.stderr, /manifest|outside|external/i);
  }
});

test('example manifest is explicitly a non-runnable template', async () => {
  const { loadManifest } = await tooling();
  await assert.rejects(loadManifest(repoPath('tests', 'corpus', 'example.manifest.json')), /template/i);
});
