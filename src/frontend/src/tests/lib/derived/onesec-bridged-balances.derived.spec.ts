import { USDC_TOKEN } from '$env/tokens/tokens-erc20/tokens.usdc.env';
import { ICP_TOKEN as ICP_BASE_ERC20_TOKEN } from '$env/tokens/tokens-evm/tokens-base/tokens-erc20/tokens.icp.env';
import { erc20DefaultTokensStore } from '$eth/stores/erc20-default-tokens.store';
import { icrcCustomTokensStore } from '$icp/stores/icrc-custom-tokens.store';
import { icrcDefaultTokensStore } from '$icp/stores/icrc-default-tokens.store';
import { ZERO } from '$lib/constants/app.constants';
import { oneSecBridgedTokensWithBalance } from '$lib/derived/onesec-bridged-balances.derived';
import { balancesStore } from '$lib/stores/balances.store';
import type { TokenId } from '$lib/types/token';
import { mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import { setupTestnetsStore } from '$tests/utils/testnets.test-utils';
import { setupUserNetworksStore } from '$tests/utils/user-networks.test-utils';
import { get } from 'svelte/store';

// The 1Sec-bridged USDC on ICP: the wrapped side of an EVM-native (`locker`) token.
const ONESEC_USDC_LEDGER = '53nhb-haaaa-aaaar-qbn5q-cai';

describe('onesec-bridged-balances.derived', () => {
	describe('oneSecBridgedTokensWithBalance', () => {
		const setBalance = ({ id, amount }: { id: TokenId; amount: bigint }) =>
			balancesStore.set({ id, data: { data: amount, certified: false } });

		beforeEach(() => {
			vi.resetAllMocks();

			erc20DefaultTokensStore.reset();
			icrcDefaultTokensStore.resetAll();
			icrcCustomTokensStore.resetAll();
			balancesStore.reinitialize();

			setupTestnetsStore('reset');
			setupUserNetworksStore('allEnabled');
		});

		it('names a wrapped ERC-20 the user holds', () => {
			erc20DefaultTokensStore.set([ICP_BASE_ERC20_TOKEN]);
			setBalance({ id: ICP_BASE_ERC20_TOKEN.id, amount: 100n });

			expect(get(oneSecBridgedTokensWithBalance).map(({ id }) => id)).toContain(
				ICP_BASE_ERC20_TOKEN.id
			);
		});

		it('ignores a wrapped ERC-20 with a zero balance', () => {
			erc20DefaultTokensStore.set([ICP_BASE_ERC20_TOKEN]);
			setBalance({ id: ICP_BASE_ERC20_TOKEN.id, amount: ZERO });

			expect(get(oneSecBridgedTokensWithBalance)).toEqual([]);
		});

		it('ignores a wrapped ERC-20 whose balance has not loaded', () => {
			erc20DefaultTokensStore.set([ICP_BASE_ERC20_TOKEN]);

			expect(get(oneSecBridgedTokensWithBalance)).toEqual([]);
		});

		it('ignores an EVM-native token the bridge merely supports', () => {
			// USDC on Ethereum is the native side of a `locker` pair, not a bridged position.
			erc20DefaultTokensStore.set([USDC_TOKEN]);
			setBalance({ id: USDC_TOKEN.id, amount: 100n });

			expect(get(oneSecBridgedTokensWithBalance)).toEqual([]);
		});

		it('names the wrapped ICRC ledger of an EVM-native token', () => {
			const wrapped = {
				...mockValidIcToken,
				ledgerCanisterId: ONESEC_USDC_LEDGER,
				symbol: 'USDC',
				enabled: true
			};

			icrcCustomTokensStore.setAll([{ data: wrapped, certified: false }]);
			setBalance({ id: wrapped.id, amount: 100n });

			expect(
				get(oneSecBridgedTokensWithBalance).map((token) => ({
					ledgerCanisterId: 'ledgerCanisterId' in token ? token.ledgerCanisterId : undefined,
					symbol: token.symbol
				}))
			).toEqual([{ ledgerCanisterId: ONESEC_USDC_LEDGER, symbol: 'USDC' }]);
		});

		it('ignores an ICP-native ICRC ledger the bridge merely supports', () => {
			// BOB on ICP is the native side of a `minter` pair, not a bridged position.
			const native = {
				...mockValidIcToken,
				ledgerCanisterId: '7pail-xaaaa-aaaas-aabmq-cai',
				symbol: 'BOB',
				enabled: true
			};

			icrcCustomTokensStore.setAll([{ data: native, certified: false }]);
			setBalance({ id: native.id, amount: 100n });

			expect(get(oneSecBridgedTokensWithBalance)).toEqual([]);
		});

		it('returns an empty list when nothing is held', () => {
			expect(get(oneSecBridgedTokensWithBalance)).toEqual([]);
		});
	});
});
