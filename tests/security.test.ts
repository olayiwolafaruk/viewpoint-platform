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
