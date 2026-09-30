import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import test from 'node:test';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const source = readFileSync(new URL('../app/api/transparencia/turismo/2024/baseline/route.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;

function loadHandler(statuses = [200, 200, 200]) {
  const calls = [];
  const payloads = [
    { quarterly: [{ hospedes: 10, dormidas: 20 }, { hospedes: 5, dormidas: 15 }] },
    { islands: [{ ilha: 'Maio', hospedes: 3, dormidas: 9, avg_stay: 3 }] },
    { year: 2024, foreign: { hotel_share: 0.8 } },
  ];
  const paths = ['../overview/route', '../islands/route', '../structure/summary/route'];
  const exports = {};
  runInNewContext(compiled, {
    exports,
    require(name) {
      if (name === 'next/server') return { NextResponse: Response };
      const index = paths.indexOf(name);
      assert.notEqual(index, -1);
      return { GET: async () => {
        calls.push(name);
        return Response.json(payloads[index], { status: statuses[index] });
      } };
    },
    fetch() { throw new Error('Baseline must not fetch the public origin'); },
    process: { env: { NEXT_PUBLIC_BASE_URL: 'https://unreachable.invalid/' } },
  });
  return { GET: exports.GET, calls };
}

test('aggregates local handlers without fetching the configured public origin', async () => {
  const { GET, calls } = loadHandler();
  const response = await GET();
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.deepEqual(body.national, { hospedes: 15, dormidas: 35 });
  assert.deepEqual(body.islands, [{ ilha: 'Maio', hospedes: 3, dormidas: 9, avg_stay: 3 }]);
  assert.equal(body.establishments.foreign.hotel_share, 0.8);
  assert.equal(calls.length, 3);
});

for (let index = 0; index < 3; index++) {
  test(`returns unavailable when source ${index + 1} fails`, async () => {
    const statuses = [200, 200, 200];
    statuses[index] = 500;
    const { GET } = loadHandler(statuses);
    const response = await GET();
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { error: 'Failed to load 2024 tourism baseline' });
  });
}
