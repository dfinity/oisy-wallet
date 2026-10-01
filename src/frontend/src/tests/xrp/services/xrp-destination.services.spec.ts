import { XRP_ACCOUNT_FLAG_REQUIRE_DEST_TAG } from '$xrp/constants/xrp.constants';
import * as xrplRest from '$xrp/rest/xrpl.rest';
import { XrpAccountNotFoundError } from '$xrp/rest/xrpl.rest';
import { loadXrpDestination } from '$xrp/services/xrp-destination.services';
import { XrpNetworks } from '$xrp/types/network';
import { isNullish } from '@dfinity/utils';

describe('xrp-destination.services', () => {
	const destination = 'rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe';
	const network = XrpNetworks.mainnet;

	// `undefined` means the node answered `actNotFound`; an Error means it could not answer; a
	// number is the account's `Flags`.
	const destinationIn = ({
		current,
		validated
	}: {
		current: number | undefined | Error;
		validated: number | undefined | Error;
	}) =>
		vi.spyOn(xrplRest, 'loadXrpAccountInfo').mockImplementation(({ ledgerIndex }) => {
			const answer = ledgerIndex === 'current' ? current : validated;

			if (answer instanceof Error) {
				return Promise.reject(answer);
			}

			if (isNullish(answer)) {
				return Promise.reject(new XrpAccountNotFoundError('XRPL account not found'));
			}

			return Promise.resolve({ balance: 0n, sequence: 1, ownerCount: 0, flags: answer });
		});

	beforeEach(() => {
		vi.clearAllMocks();

		vi.stubGlobal('fetch', () => Promise.reject(new Error('unexpected network call in a test')));
	});

	describe('loadXrpDestination', () => {
		it('reads the destination from both ledger snapshots', async () => {
			destinationIn({ current: 0, validated: 0 });

			await loadXrpDestination({ destination, network });

			expect(xrplRest.loadXrpAccountInfo).toHaveBeenCalledTimes(2);
			expect(xrplRest.loadXrpAccountInfo).toHaveBeenCalledWith({
				address: destination,
				network,
				ledgerIndex: 'current'
			});
			expect(xrplRest.loadXrpAccountInfo).toHaveBeenCalledWith({
				address: destination,
				network,
				ledgerIndex: 'validated'
			});
		});

		it('reports an account present in both snapshots as settled', async () => {
			destinationIn({ current: 0, validated: 0 });

			await expect(loadXrpDestination({ destination, network })).resolves.toEqual({
				settled: true,
				requiresTag: false,
				unavailable: undefined
			});
		});

		// A creation or a deletion that has not validated can still be rolled back, so either
		// snapshot missing the account leaves it unsettled.
		it.each([
			{ name: 'the open ledger', current: undefined, validated: 0 },
			{ name: 'the validated ledger', current: 0, validated: undefined },
			{ name: 'both ledgers', current: undefined, validated: undefined }
		])('reports an account missing from $name as unsettled', async ({ current, validated }) => {
			destinationIn({ current, validated });

			await expect(loadXrpDestination({ destination, network })).resolves.toEqual({
				settled: false,
				requiresTag: false,
				unavailable: undefined
			});
		});

		it.each([
			{ name: 'the open ledger', current: XRP_ACCOUNT_FLAG_REQUIRE_DEST_TAG, validated: 0 },
			{ name: 'the validated ledger', current: 0, validated: XRP_ACCOUNT_FLAG_REQUIRE_DEST_TAG }
		])('requires a tag when only $name sets the bit', async ({ current, validated }) => {
			destinationIn({ current, validated });

			await expect(loadXrpDestination({ destination, network })).resolves.toMatchObject({
				requiresTag: true
			});
		});

		// Never rejects: whether an unanswerable read matters depends on the amount and the tag,
		// which only the caller knows.
		it('keeps the error of a snapshot that could not be read', async () => {
			const error = new Error('tooBusy');

			destinationIn({ current: 0, validated: error });

			await expect(loadXrpDestination({ destination, network })).resolves.toEqual({
				settled: false,
				requiresTag: false,
				unavailable: error
			});
		});

		it('wraps a non-Error rejection', async () => {
			vi.spyOn(xrplRest, 'loadXrpAccountInfo').mockRejectedValue('tooBusy');

			const { unavailable } = await loadXrpDestination({ destination, network });

			expect(unavailable).toBeInstanceOf(Error);
			expect(unavailable?.message).toBe('tooBusy');
		});
	});
});
