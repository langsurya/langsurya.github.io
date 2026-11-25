import assert from 'node:assert/strict';
import test from 'node:test';
import { createAppState } from './app-state.js';
import { createTranslationLifecycle } from '../app.js';
import { isUnchangedTranslation } from '../services/translation-service.js';
import { detectLanguageByText, shouldApplyDetectedLanguage, snapshotSelectedVoice } from '../services/voice-service.js';
import { createWakeLockService } from '../services/wake-lock-service.js';
import { normalizeTextForSpeech } from '../services/speech-service.js';
import { chunkText } from '../controllers/reader-controller.js';

const acronymPronunciations = {
  BPJS:'be pe je es',
  DPR:'de pe er',
  SIM:'sim',
  TNI:'te en i',
  UNICEF:'unisef'
};

test('known Indonesian initialisms use natural letter pronunciation', () => {
  assert.equal(
    normalizeTextForSpeech('TNI bekerja sama dengan DPR dan BPJS.', acronymPronunciations),
    'te en i bekerja sama dengan de pe er dan be pe je es.'
  );
});

test('known word acronyms are pronounced as words', () => {
  assert.equal(normalizeTextForSpeech('SIM dan UNICEF', acronymPronunciations), 'sim dan unisef');
});

test('unknown long uppercase words retain the natural lowercase fallback', () => {
  assert.equal(normalizeTextForSpeech('INDONESIA maju'), 'indonesia maju');
});

test('English voices do not receive Indonesian phonetic acronym spellings', () => {
  assert.equal(
    normalizeTextForSpeech('The TEM process detects UAS activity.', { TEM:'ti i em' }, 'en-US'),
    'The TEM process detects UAS activity.'
  );
});

test('Indonesian voices still use dictionary pronunciation', () => {
  assert.equal(
    normalizeTextForSpeech('Proses TEM dimulai.', { TEM:'ti i em' }, 'id-ID'),
    'Proses ti i em dimulai.'
  );
});

test('English examples, parentheses, and numbered lists become natural pauses', () => {
  assert.equal(
    normalizeTextForSpeech(
      'TEM relies on three steps:\n1. Anticipation (e.g., pre-flight checks).\n2. Recognition.',
      {},
      'en-US'
    ),
    'TEM relies on three steps: 1. Anticipation, for example, pre-flight checks. 2. Recognition.'
  );
});

test('chunking keeps dotted abbreviations together for speech normalization', () => {
  const source = 'Expecting threats (e.g., weather or pre-flight checks). Recognition follows.';
  const chunks = chunkText(source);
  assert.deepEqual(
    chunks.map(item => item.text),
    ['Expecting threats (e.g., weather or pre-flight checks). Recognition follows.']
  );
  assert.equal(
    normalizeTextForSpeech(chunks[0].text, {}, 'en-US'),
    'Expecting threats, for example, weather or pre-flight checks. Recognition follows.'
  );
});

test('chunking also preserves i.e. and similar initial abbreviations', () => {
  const source = 'Use the safer option (i.e., stop the operation). Continue afterward.';
  assert.deepEqual(
    chunkText(source).map(item => item.text),
    ['Use the safer option (i.e., stop the operation). Continue afterward.']
  );
});

test('adjacent sentences in one paragraph remain one continuous utterance', () => {
  assert.deepEqual(
    chunkText('First sentence. Second sentence. Third sentence.').map(item => item.text),
    ['First sentence. Second sentence. Third sentence.']
  );
});

test('blank lines keep paragraphs as separate utterances', () => {
  assert.deepEqual(
    chunkText('First sentence. Second sentence.\n\nThird sentence.').map(item => item.text),
    ['First sentence. Second sentence.', 'Third sentence.']
  );
});

test('decimal versions and titles are not treated as sentence endings', () => {
  const source = 'Dr. Smith reviewed version 22.23.4. The result was 9.2 points.';
  assert.deepEqual(
    chunkText(source).map(item => item.text),
    ['Dr. Smith reviewed version 22.23.4. The result was 9.2 points.']
  );
});

test('initial abbreviations remain intact while real sentences split', () => {
  const source = 'The U.S. team consulted A. B. Carter, Ph.D. They continued afterward.';
  assert.deepEqual(
    chunkText(source).map(item => item.text),
    ['The U.S. team consulted A. B. Carter, Ph.D. They continued afterward.']
  );
});

test('long speech remains split near the configured safe limit', () => {
  const source = `${'word '.repeat(45).trim()}. ${'next '.repeat(45).trim()}.`;
  const chunks = chunkText(source, 180);
  assert.ok(chunks.length > 1);
  assert.ok(chunks.every(item => item.text.length <= 180));
});

test('manual language preference blocks detection', () => {
  assert.equal(shouldApplyDetectedLanguage('manual'), false);
  assert.equal(shouldApplyDetectedLanguage('detected'), true);
});

test('Indonesian prose is detected as Indonesian', () => {
  const text = 'Sebenarnya semua kegaduhan politik Indonesia hari ini tidak dimulai saat itu, karena masalah ini sudah ada lebih lama dan masih menjadi perhatian semua pihak.';
  assert.equal(detectLanguageByText(text), 'id');
});

test('English prose is detected as English before Indonesian translation', () => {
  const text = 'The government will provide more information about the program when the new policy is ready, and they will explain what people should do next.';
  assert.equal(detectLanguageByText(text), 'en');
});

test('short English text remains eligible for provider auto detection', () => {
  assert.equal(detectLanguageByText('Hello, how are you?'), null);
});

test('translation detects a provider response that leaves prose unchanged', () => {
  assert.equal(
    isUnchangedTranslation(
      'People usually get to know each other better.',
      'People usually get to know each other better.'
    ),
    true
  );
  assert.equal(
    isUnchangedTranslation(
      'People usually get to know each other better.',
      'Orang biasanya menjadi lebih mengenal satu sama lain.'
    ),
    false
  );
});

test('voice test snapshots the current selected voice', () => {
  const voices = [{ name:'A', lang:'en-US' }, { name:'B', lang:'id-ID' }];
  assert.deepEqual(snapshotSelectedVoice(voices, 'B', 'en-US'), { voice:voices[1], lang:'id-ID' });
});

test('changing a voice resolves the newly selected voice instead of the first voice', () => {
  const voices = [
    { name:'Microsoft Andika', lang:'id-ID' },
    { name:'Google Bahasa Indonesia', lang:'id-ID' }
  ];
  const selected = snapshotSelectedVoice(voices, 'Google Bahasa Indonesia', 'id-ID');
  assert.equal(selected.voice, voices[1]);
  assert.equal(selected.lang, 'id-ID');
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
