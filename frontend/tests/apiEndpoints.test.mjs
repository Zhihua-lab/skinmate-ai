import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveAnalyzeEndpoint, resolveReviseEndpoint } from '../src/apiEndpoints.js';

test('defaults analyze endpoint to Netlify function path in production', () => {
  assert.equal(resolveAnalyzeEndpoint('', true), '/.netlify/functions/analyze-video');
});

test('defaults revise endpoint to Netlify function path in production', () => {
  assert.equal(resolveReviseEndpoint('', true), '/.netlify/functions/revise-plan');
});

test('defaults analyze endpoint to api proxy in development', () => {
  assert.equal(resolveAnalyzeEndpoint('', false), '/api/analyze-video');
});

test('defaults revise endpoint to api proxy in development', () => {
  assert.equal(resolveReviseEndpoint('', false), '/api/revise-plan');
});

test('normalizes trailing slash on direct backend base', () => {
  assert.equal(
    resolveAnalyzeEndpoint('https://backend.example.com/', false),
    'https://backend.example.com/analyze-video',
  );
  assert.equal(
    resolveReviseEndpoint('https://backend.example.com/', false),
    'https://backend.example.com/revise-plan',
  );
});
