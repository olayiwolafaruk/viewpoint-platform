import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, verifyPassword } from '../src/lib/security/password';
import { verifyTurnstile } from '../src/lib/security/turnstile';

test('password hashing verifies correct password and rejects incorrect and malformed hashes', async () => {
 const password = 'example password 123';
 const first = await hashPassword(password);
 const second = await hashPassword(password);
 assert.notEqual(first, second);
 assert.equal(await verifyPassword(password, first), true);
 assert.equal(await verifyPassword('wrong password', first), false);
 assert.equal(await verifyPassword(password, 'bad$hash'), false);
 await assert.rejects(() => hashPassword('short'));
});
test('Turnstile fails closed without required configuration', async () => {
 assert.deepEqual(await verifyTurnstile({token:'',secret:'',expectedHostname:'',expectedAction:''}), {ok:false,reason:'invalid'});
});

test('Turnstile checks hostname and action and fails closed on errors', async () => {
 const original = globalThis.fetch;
 const options = {token:'token',secret:'secret',expectedHostname:'earn.example.com',expectedAction:'login'};
 try {
  globalThis.fetch = async () => Response.json({success:true,hostname:'earn.example.com',action:'login'});
  assert.deepEqual(await verifyTurnstile(options),{ok:true});
  globalThis.fetch = async () => Response.json({success:true,hostname:'other.example.com',action:'login'});
  assert.deepEqual(await verifyTurnstile(options),{ok:false,reason:'invalid'});
  globalThis.fetch = async () => Response.json({success:true,hostname:'earn.example.com',action:'register'});
  assert.deepEqual(await verifyTurnstile(options),{ok:false,reason:'invalid'});
  globalThis.fetch = async () => {throw new Error('network error')};
  assert.deepEqual(await verifyTurnstile(options),{ok:false,reason:'unavailable'});
 } finally { globalThis.fetch = original; }
});

test('request body reader rejects oversized content even without content-length', async () => {
 const { readLimitedBody } = await import('../src/lib/security/request');
 const valid = new Request('https://example.com', {method:'POST',body:'abc'});
 assert.equal(await readLimitedBody(valid,3),'abc');
 const large = new Request('https://example.com', {method:'POST',body:'abcd'});
 assert.equal(await readLimitedBody(large,3),null);
});
