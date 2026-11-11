import assert from 'node:assert/strict';
import test from 'node:test';
import { createAppState } from './app-state.js';
import { createTranslationLifecycle } from '../app.js';
import { shouldApplyDetectedLanguage, snapshotSelectedVoice } from '../services/voice-service.js';
import { createWakeLockService } from '../services/wake-lock-service.js';

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

function createWakeLockHarness() {
  const locks = [];
  let requests = 0;
  const documentRef = { visibilityState:'visible' };
  const navigatorRef = {
    wakeLock: {
      async request() {
        requests++;
        const listeners = new Map();
        const lock = {
          released:false,
          addEventListener(type, listener) { listeners.set(type, listener); },
          async release() {
            if (this.released) return;
            this.released = true;
            listeners.get('release')?.();
          }
        };
        locks.push(lock);
        return lock;
      }
    }
  };
  const service = createWakeLockService({
    navigatorRef,
    documentRef,
    windowRef:{},
    secureContext:true
  });
  return { documentRef, locks, service, getRequests:() => requests };
}

test('wake lock deduplicates concurrent requests', async () => {
  const harness = createWakeLockHarness();
  const first = harness.service.hold(true);
  const second = harness.service.hold(true);
  assert.equal(await first, true);
  assert.equal(await second, true);
  assert.equal(harness.getRequests(), 1);
  assert.equal(harness.service.isHeld(), true);
});

test('wake lock releases while hidden and reacquires when visible', async () => {
  const harness = createWakeLockHarness();
  await harness.service.hold(true);
  harness.documentRef.visibilityState = 'hidden';
  await harness.service.handleVisibilityChange();
  assert.equal(harness.locks[0].released, true);
  assert.equal(harness.service.isHeld(), false);

  harness.documentRef.visibilityState = 'visible';
  await harness.service.handleVisibilityChange();
  assert.equal(harness.getRequests(), 2);
  assert.equal(harness.service.isHeld(), true);
});

test('wake lock remains optional when unsupported', async () => {
  const service = createWakeLockService({
    navigatorRef:{},
    documentRef:{ visibilityState:'visible' },
    windowRef:{},
    secureContext:true
  });
  assert.equal(await service.hold(true), false);
  assert.equal(service.isHeld(), false);
});
