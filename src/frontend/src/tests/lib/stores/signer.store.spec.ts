import { REPLICA_HOST } from '$lib/constants/app.constants';
import { initSignerContext } from '$lib/stores/signer.store';
import { Signer } from '@dfinity/oisy-wallet-signer/signer';
import { Ed25519KeyIdentity } from '@icp-sdk/core/identity';
import { get } from 'svelte/store';
import type { MockInstance } from 'vitest';

describe('SignerContext', () => {
	const identity = Ed25519KeyIdentity.generate();

	it('initializes the signer with the owner identity and registers methods', () => {
		const { init } = initSignerContext();

		const spy = vi.spyOn(Signer, 'init');

		init({ owner: identity });

		expect(spy).toHaveBeenCalledWith({
			owner: identity,
			host: REPLICA_HOST
		});
	});

	describe('init with a signer already running', () => {
		const otherIdentity = Ed25519KeyIdentity.generate();

		const messageListeners = (spy: MockInstance<typeof window.addEventListener>) =>
			spy.mock.calls.filter(([type]) => type === 'message').map(([, listener]) => listener);

		afterEach(() => {
			vi.restoreAllMocks();
		});

		it('disconnects the previous signer when the owner changes', () => {
			const { init } = initSignerContext();

			const addSpy = vi.spyOn(window, 'addEventListener');
			const removeSpy = vi.spyOn(window, 'removeEventListener');

			init({ owner: identity });
			init({ owner: otherIdentity });

			const [previous, current] = messageListeners(addSpy);

			expect(removeSpy).toHaveBeenCalledWith('message', previous);
			expect(removeSpy).not.toHaveBeenCalledWith('message', current);
		});

		it('initializes the new signer with the new owner', () => {
			const { init } = initSignerContext();

			const spy = vi.spyOn(Signer, 'init');

			init({ owner: identity });
			init({ owner: otherIdentity });

			expect(spy).toHaveBeenCalledTimes(2);
			expect(spy).toHaveBeenLastCalledWith({
				owner: otherIdentity,
				host: REPLICA_HOST
			});
		});

		it('clears the prompts when the owner changes', () => {
			const { init, accountsPrompt, permissionsPrompt, consentMessagePrompt, callCanisterPrompt } =
				initSignerContext();

			init({ owner: identity });
			init({ owner: otherIdentity });

			expect(get(accountsPrompt.payload)).toBeNull();
			expect(get(permissionsPrompt.payload)).toBeNull();
			expect(get(consentMessagePrompt.payload)).toBeNull();
			expect(get(callCanisterPrompt.payload)).toBeNull();
		});

		it('keeps the running signer when the same identity is set again', () => {
			const { init } = initSignerContext();

			const initSpy = vi.spyOn(Signer, 'init');
			const removeSpy = vi.spyOn(window, 'removeEventListener');

			init({ owner: identity });
			init({ owner: identity });

			expect(initSpy).toHaveBeenCalledOnce();
			expect(removeSpy).not.toHaveBeenCalledWith('message', expect.any(Function));
		});

		it('starts a new signer for the same identity after a reset', () => {
			const { init, reset } = initSignerContext();

			const spy = vi.spyOn(Signer, 'init');

			init({ owner: identity });
			reset();
			init({ owner: identity });

			expect(spy).toHaveBeenCalledTimes(2);
		});
	});

	describe('accounts', () => {
		it('payload should be undefined per default', () => {
			const { accountsPrompt } = initSignerContext();

			const payload = get(accountsPrompt.payload);

			expect(payload).toBeUndefined();
		});

		// TODO: cover prompt registration and usage with E2E tests

		it('payload should be null after reset', () => {
			const { accountsPrompt, reset } = initSignerContext();

			reset();

			const payload = get(accountsPrompt.payload);

			expect(payload).toBeNull();
		});
	});

	describe('permissions', () => {
		it('payload should be undefined per default', () => {
			const { permissionsPrompt } = initSignerContext();

			const payload = get(permissionsPrompt.payload);

			expect(payload).toBeUndefined();
		});

		// TODO: cover prompt registration and usage with E2E tests

		it('payload should be null after reset', () => {
			const { permissionsPrompt, reset } = initSignerContext();

			reset();

			const payload = get(permissionsPrompt.payload);

			expect(payload).toBeNull();
		});
	});

	describe('consentMessage', () => {
		it('payload should be undefined per default', () => {
			const { consentMessagePrompt } = initSignerContext();

			const payload = get(consentMessagePrompt.payload);

			expect(payload).toBeUndefined();
		});

		// TODO: cover prompt registration and usage with E2E tests

		it('payload should be null after reset', () => {
			const { consentMessagePrompt, reset } = initSignerContext();

			reset();

			const payload = get(consentMessagePrompt.payload);

			expect(payload).toBeNull();
		});
	});

	describe('callCanister', () => {
		it('payload should be undefined per default', () => {
			const { callCanisterPrompt } = initSignerContext();

			const payload = get(callCanisterPrompt.payload);

			expect(payload).toBeUndefined();
		});

		// TODO: cover prompt registration and usage with E2E tests

		it('payload should be null after reset', () => {
			const { callCanisterPrompt, reset } = initSignerContext();

			reset();

			const payload = get(callCanisterPrompt.payload);

			expect(payload).toBeNull();
		});
	});
});
