import { mapIcrcData } from '$icp/utils/map-icrc-data';
import * as appConstants from '$lib/constants/app.constants';
import { describe, expect, it, vi } from 'vitest';

describe('mapIcrcData', () => {
	const token = {
		TESTTOKEN: {
			ledgerCanisterId: 'dummy-ledger-id',
			indexCanisterId: 'dummy-canister-id'
		}
	};

	const expected = {
		TESTTOKEN: { ...token.TESTTOKEN, exchangeCoinId: 'internet-computer' }
	};

	describe.each([
		{ env: 'PROD', expected },
		{ env: 'BETA', expected },
		{ env: 'STAGING', expected: {} },
		{ env: 'LOCAL', expected: {} }
	])('when %s is true', ({ env, expected }) => {
		beforeEach(() => {
			vi.resetAllMocks();

			vi.spyOn(appConstants, env as keyof typeof appConstants, 'get').mockImplementation(
				() => true
			);
		});

		it('should map ICRC tokens correctly', () => {
			const result = mapIcrcData(token);
			expect(result).toEqual(expected);
		});
	});

	it('should handle empty input', () => {
		const result = mapIcrcData({});
		expect(result).toEqual({});
	});
});
