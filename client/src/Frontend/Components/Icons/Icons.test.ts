import { cleanup, render, screen } from '@testing-library/svelte';
import { afterEach, expect } from 'vitest';
import FoundRuins from './FoundRuins.svelte';
import Quasar from './Quasar.svelte';

afterEach(() => cleanup());

test('Quasar icon: default', () => {
  render(Quasar);

  const el = screen.getByRole('img');
  expect(el).toBeTruthy();
  expect(el.getAttribute('alt')).toEqual('Quasar');
  expect(el.getAttribute('src')?.endsWith('.svg')).toEqual(true);
  expect(el.getAttribute('width')).toEqual('48px');
  expect(el.getAttribute('height')).toEqual('48px');
});

test('Quasar icon: custom height & width', () => {
  render(Quasar, { height: '24px', width: '24px' });

  const el = screen.getByRole('img');
  expect(el).toBeTruthy();
  expect(el.getAttribute('width')).toEqual('24px');
  expect(el.getAttribute('height')).toEqual('24px');
});

test('Quasar icon: rerender with new prop', () => {
  const { rerender } = render(Quasar);

  rerender({ width: '96px' });

  const el = screen.getByRole('img');
  expect(el).toBeTruthy();
  expect(el.getAttribute('width')).toEqual('96px');
  expect(el.getAttribute('height')).toEqual('48px');
});

test('FoundRuins icon: default', () => {
  render(FoundRuins);

  const el = screen.getByRole('img');
  expect(el).toBeTruthy();
  expect(el.getAttribute('alt')).toEqual('FoundRuins');
  expect(el.getAttribute('src')?.endsWith('.svg')).toEqual(true);
  expect(el.getAttribute('width')).toEqual('48px');
  expect(el.getAttribute('height')).toEqual('48px');
});
