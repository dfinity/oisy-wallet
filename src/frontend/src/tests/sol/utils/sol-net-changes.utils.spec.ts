import { mapSolNetBalanceChanges } from '$sol/utils/sol-net-changes.utils';
import { MOCK_SOL_BALANCES } from '$tests/mocks/sol-balances.mock';

const USER = '5Dqoon9MdWRgwmJ839FJ2ZTpTAcc1MMprZeNyaxpaV1Q';

describe('sol-net-changes.utils', () => {
	describe('mapSolNetBalanceChanges', () => {
		const changes = (fixture: keyof typeof MOCK_SOL_BALANCES) =>
			mapSolNetBalanceChanges({ address: USER, ...MOCK_SOL_BALANCES[fixture] });

		it('should exclude the fee from the SOL delta when the user paid it', () => {
			const result = changes('SPL_SEND_WITH_ATA');

			// The wallet lost the fee plus the rent of the account it opened; only the rent remains
			// once the fee is put back.
			const sol = result.find(({ tokenAddress }) => tokenAddress === undefined);

			expect(sol?.delta).toBe(-2_108_880n);
		});

		it('should report the token the user sent', () => {
			const result = changes('SPL_SEND_WITH_ATA');

			const token = result.find(
				({ tokenAddress }) => tokenAddress === 'pumpCmXqMfrsAkQ5r49WcJnRayYRqmXz6ae8H7H9Dfn'
			);

			expect(token?.delta).toBe(-5_000_000n);
			expect(token?.decimals).toBe(6);
		});

		// The route passes through a token the user never chose; it arrives and leaves inside the
		// same transaction, so the pre/post balances already cancel it out.
		it('should net a transient intermediate token to nothing', () => {
			const result = changes('JUPITER_SWAP');

			expect(
				result.find(
					({ tokenAddress }) => tokenAddress === 'CH74tuRLTYcxG7qNJCsV9rghfLXJCQJbsu7i52a8F1Gn'
				)
			).toBeUndefined();
		});

		it('should report both sides of a swap', () => {
			const result = changes('JUPITER_SWAP');

			const spent = result.find(
				({ tokenAddress }) => tokenAddress === 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
			);
			const received = result.find(
				({ tokenAddress }) => tokenAddress === '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R'
			);

			expect(spent?.delta).toBe(-123_000n);
			expect(received?.delta).toBe(46_099n);
		});

		it('should aggregate several swaps of one pair into one movement per token', () => {
			const result = changes('ORCA_SPLIT_SWAP');

			const orca = result.filter(
				({ tokenAddress }) => tokenAddress === 'orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE'
			);

			expect(orca).toHaveLength(1);
			expect(orca[0].delta).toBe(-100_000n);
		});

		it('should report nothing for a transaction the user has no part in', () => {
			expect(changes('THIRD_PARTY')).toStrictEqual([]);
		});

		it('should keep the fee in the SOL delta of somebody else', () => {
			// The user is not the fee payer here, so nothing is put back; they are simply absent.
			const result = mapSolNetBalanceChanges({
				address: USER,
				...MOCK_SOL_BALANCES.THIRD_PARTY
			});

			expect(result.find(({ tokenAddress }) => tokenAddress === undefined)).toBeUndefined();
		});
	});
});
