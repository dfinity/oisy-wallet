import { ICP_TOKEN } from '$env/tokens.env';
import { tokenAsIcToken } from '$icp/derived/ic-token.derived';
import { token } from '$lib/stores/token.store';
import { get } from 'svelte/store';
import { expect } from 'vitest';

describe('Derived store tokenAsIcToken', () => {
	it('should return undefined when token is not set', () => {
		expect(get(tokenAsIcToken)).toBeUndefined();
	});

	it('should return token as IcToken when token is set', () => {
		token.set(ICP_TOKEN);

		expect(get(tokenAsIcToken)).toBe(ICP_TOKEN);

		expect(get(tokenAsIcToken)).toHaveProperty('ledgerCanisterId');
		expect(get(tokenAsIcToken)).toHaveProperty('indexCanisterId');
	});

	it('should return undefined when token is set to undefined', () => {
		token.set(undefined);

		expect(get(tokenAsIcToken)).toBeUndefined();
	});

	it('should return null when token is set to null', () => {
		token.set(null);

		expect(get(tokenAsIcToken)).toBeNull();
	});

	it('should return null when token is reset', () => {
		token.set(ICP_TOKEN);
		token.reset();

		expect(get(tokenAsIcToken)).toBeNull();
	});
});
