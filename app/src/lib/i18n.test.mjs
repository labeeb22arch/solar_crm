import test from 'node:test';
import assert from 'node:assert/strict';
import { DICT, LANGS, t, getLang } from './i18n.js';

test('falls back to English when a key is missing in the chosen language', () => {
  const key = 'job.add';
  const saved = DICT.gu[key];
  delete DICT.gu[key];
  try {
    assert.equal(t(key, null, 'gu'), DICT.en[key]);
  } finally {
    DICT.gu[key] = saved;
  }
  assert.equal(t('no.such.key', null, 'hi'), 'no.such.key');
  assert.equal(t('job.add', null, 'xx'), DICT.en['job.add']);
});

test('replaces {name} placeholders and leaves unknown ones alone', () => {
  assert.equal(t('partner.welcome', { name: 'Hetal' }, 'en'), 'Welcome, Hetal');
  assert.equal(t('partner.welcome', { name: 'Hetal' }, 'gu'), 'નમસ્તે, Hetal');
  assert.equal(t('job.modulesCount', { count: 0, expected: 6 }, 'hi'), '0/6 पैनल');
  assert.equal(t('partner.welcome', {}, 'en'), 'Welcome, {name}');
});

test('every English key exists, non-empty, in Gujarati and Hindi with the same placeholders', () => {
  const ph = (s) => (s.match(/\{\w+\}/g) || []).sort().join(',');
  for (const lang of ['gu', 'hi']) {
    for (const [key, en] of Object.entries(DICT.en)) {
      const s = DICT[lang][key];
      assert.ok(typeof s === 'string' && s.trim(), `${lang} is missing ${key}`);
      assert.equal(ph(s), ph(en), `${lang} placeholders differ for ${key}`);
    }
    for (const key of Object.keys(DICT[lang])) assert.ok(key in DICT.en, `${lang} has extra key ${key}`);
  }
});

test('language list and default', () => {
  assert.deepEqual(LANGS.map(([c]) => c), ['en', 'gu', 'hi']);
  assert.ok(['en', 'gu', 'hi'].includes(getLang()));
});
