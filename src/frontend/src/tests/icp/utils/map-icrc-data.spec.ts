import { getIcrcAccount } from '$icp/utils/icrc-account.utils';
import { mapIcrcData } from '$icp/utils/map-icrc-data';
import * as appConstants from '$lib/constants/app.constants';
import { mockPrincipal } from '$tests/mocks/identity.mock';
import { decodeIcrcAccount, encodeIcrcAccount } from '@icp-sdk/canisters/ledger/icrc';

describe('mapIcrcData', () => {
	const token = {
		TESTTOKEN: {
			ledgerCanisterId: 'dummy-ledger-id',
			indexCanisterId: 'dummy-canister-id',
			mintingAccount: encodeIcrcAccount(getIcrcAccount(mockPrincipal))
		}
	};

	const expected = {
		TESTTOKEN: { ...token.TESTTOKEN, mintingAccount: decodeIcrcAccount(mockPrincipal.toText()) }
	};

	const envs = [
		{ env: 'PROD', expected },
		{ env: 'BETA', expected },
		{ env: 'STAGING', expected },
		{ env: 'LOCAL', expected: {} }
	];

	describe.each(envs)('when $env is true', ({ env, expected }) => {
		beforeEach(() => {
			vi.resetAllMocks();

			envs.forEach(({ env: e }) => {
				vi.spyOn(appConstants, e as keyof typeof appConstants, 'get').mockImplementation(
					() => false
				);
			});

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
