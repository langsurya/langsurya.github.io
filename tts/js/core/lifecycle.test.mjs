import assert from 'node:assert/strict';
import test from 'node:test';
import { createAppState } from './app-state.js';
import { createTranslationLifecycle } from '../app.js';
import { shouldApplyDetectedLanguage, snapshotSelectedVoice } from '../services/voice-service.js';

test('manual language preference blocks detection', () => {
  assert.equal(shouldApplyDetectedLanguage('manual'), false);
  assert.equal(shouldApplyDetectedLanguage('detected'), true);
});

test('voice test snapshots the current selected voice', () => {
  const voices = [{ name:'A', lang:'en-US' }, { name:'B', lang:'id-ID' }];
  assert.deepEqual(snapshotSelectedVoice(voices, 'B', 'en-US'), { voice:voices[1], lang:'id-ID' });
});

test('stale translation cannot transition to done', async () => {
  const appState = createAppState();
  const resolvers = [];
  const translationService = {
    cancel() {},
    translate() { return new Promise(resolve => resolvers.push(resolve)); }
  };
  const lifecycle = createTranslationLifecycle({ appState, translationService });
  const first = lifecycle.run('first', 'en');
  const second = lifecycle.run('second', 'en');
  resolvers[0]({ text:'lama' });
  assert.equal(await first, null);
  resolvers[1]({ text:'baru' });
  assert.deepEqual(await second, { text:'baru' });
  assert.equal(appState.getSnapshot().translation.status, 'done');
});

test('cancel restores cancelled translation state', () => {
  const appState = createAppState();
  const lifecycle = createTranslationLifecycle({ appState, translationService:{ cancel() {}, translate() {} } });
  lifecycle.cancel();
  assert.equal(appState.getSnapshot().translation.status, 'cancelled');
});
