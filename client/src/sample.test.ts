import { expect, test } from 'vitest';

test('can run tests in the client', async () => {
  expect(true).to.equal(true);
  expect(false).to.not.equal(true);
});
