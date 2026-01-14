import { PEPE_TOKEN } from '$env/tokens/tokens-erc20/tokens.pepe.env';
import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import type { IcToken } from '$icp/types/ic-token';
import * as exchanges from '$lib/derived/exchange.derived';
import { balancesStore } from '$lib/stores/balances.store';
import { initSwapContext } from '$lib/stores/swap.store';
import { bn1Bi, bn2Bi } from '$tests/mocks/balances.mock';
import { mockValidErc20Token } from '$tests/mocks/erc20-tokens.mock';
import { mockValidIcCkToken } from '$tests/mocks/ic-tokens.mock';
import { mockPage } from '$tests/mocks/page.store.mock';
import { testDerivedUpdates } from '$tests/utils/derived.test-utils';
import { get, readable } from 'svelte/store';

const ckBtcExchangeValue = 1;
const icpExchangeValue = 2;
const ckBtcToken = {
	...mockValidIcCkToken,
	symbol: BTC_MAINNET_TOKEN.twinTokenSymbol
} as IcToken;

describe('swapStore', () => {
	const mockToken1 = { ...ckBtcToken, enabled: true };
	const mockToken2 = { ...ICP_TOKEN, enabled: false };

	beforeEach(() => {
		mockPage.reset();

		vi.spyOn(exchanges, 'exchanges', 'get').mockImplementation(() =>
			readable({
				[mockToken1.id]: { usd: ckBtcExchangeValue },
				[mockToken2.id]: { usd: icpExchangeValue }
			})
		);
	});

	it('should ensure derived stores update at most once when the store changes', async () => {
		await testDerivedUpdates(() =>
			initSwapContext({
				destinationToken: mockToken1,
				sourceToken: mockToken2
			})
		);
	});

	it('should have all expected values', () => {
		const {
			sourceToken,
			sourceTokenBalance,
			sourceTokenExchangeRate,
			destinationTokenExchangeRate,
			destinationTokenBalance,
			destinationToken
		} = initSwapContext({
			destinationToken: mockToken1,
			sourceToken: mockToken2
		});
		const ckBtcBalance = bn1Bi;
		const icpBalance = bn2Bi;

		balancesStore.set({
			id: mockToken1.id,
			data: { data: ckBtcBalance, certified: true }
		});
		balancesStore.set({
			id: mockToken2.id,
			data: { data: icpBalance, certified: true }
		});

		expect(get(sourceToken)).toBe(mockToken2);
		expect(get(destinationToken)).toBe(mockToken1);

		expect(get(sourceTokenBalance)).toStrictEqual(icpBalance);
		expect(get(destinationTokenBalance)).toStrictEqual(ckBtcBalance);

		expect(get(sourceTokenExchangeRate)).toStrictEqual(icpExchangeValue);
		expect(get(destinationTokenExchangeRate)).toStrictEqual(ckBtcExchangeValue);
	});

	it('should reset all values', () => {
		const {
			sourceToken,
			sourceTokenBalance,
			sourceTokenExchangeRate,
			destinationTokenExchangeRate,
			destinationTokenBalance,
			destinationToken,
			reset
		} = initSwapContext({
			destinationToken: mockToken1,
			sourceToken: mockToken2
		});
		const ckBtcBalance = bn1Bi;
		const icpBalance = bn2Bi;

		balancesStore.set({
			id: mockToken1.id,
			data: { data: ckBtcBalance, certified: true }
		});
		balancesStore.set({
			id: mockToken2.id,
			data: { data: icpBalance, certified: true }
		});

		reset();

		expect(get(sourceToken)).toBe(undefined);
		expect(get(destinationToken)).toBe(undefined);

		expect(get(sourceTokenBalance)).toBe(undefined);
		expect(get(destinationTokenBalance)).toBe(undefined);

		expect(get(sourceTokenExchangeRate)).toBe(undefined);
		expect(get(destinationTokenExchangeRate)).toBe(undefined);
	});

	it('should set tokens correctly', () => {
		const { sourceToken, destinationToken, setSourceToken, setDestinationToken } = initSwapContext({
			destinationToken: mockToken1,
			sourceToken: mockToken2
		});

		expect(get(sourceToken)).toBe(mockToken2);
		expect(get(destinationToken)).toBe(mockToken1);

		setSourceToken(mockToken1);
		setDestinationToken(mockToken2);

		expect(get(sourceToken)).toBe(mockToken1);
		expect(get(destinationToken)).toBe(mockToken2);
	});

	it('should switch tokens correctly', () => {
		const { sourceToken, destinationToken, switchTokens } = initSwapContext({
			destinationToken: mockToken1,
			sourceToken: mockToken2
		});

		expect(get(sourceToken)).toBe(mockToken2);
		expect(get(destinationToken)).toBe(mockToken1);

		switchTokens();

		expect(get(sourceToken)).toBe(mockToken1);
		expect(get(destinationToken)).toBe(mockToken2);
	});

	describe('isSourceTokenIcrc2', () => {
		it('should initialize with empty values', () => {
			const { isSourceTokenIcrc2 } = initSwapContext({
				sourceToken: mockToken1
			});

			expect(get(isSourceTokenIcrc2)).toBeUndefined();
		});

		it('should return undefined when sourceToken is not set', () => {
			const { isSourceTokenIcrc2 } = initSwapContext();

			expect(get(isSourceTokenIcrc2)).toBeUndefined();
		});

		it('should cache ICRC2 support status', () => {
			const { isSourceTokenIcrc2, setIsTokensIcrc2 } = initSwapContext({
				sourceToken: mockToken1
			});

			expect(get(isSourceTokenIcrc2)).toBeUndefined();

			setIsTokensIcrc2({ ledgerCanisterId: mockToken1.ledgerCanisterId, isIcrc2Supported: true });

			expect(get(isSourceTokenIcrc2)).toBeTruthy();
		});

		it('should update isSourceTokenIcrc2 when cache changes', () => {
			const { isSourceTokenIcrc2, setIsTokensIcrc2 } = initSwapContext({
				sourceToken: mockToken1
			});

			setIsTokensIcrc2({ ledgerCanisterId: mockToken1.ledgerCanisterId, isIcrc2Supported: false });

			expect(get(isSourceTokenIcrc2)).toBeFalsy();

			setIsTokensIcrc2({ ledgerCanisterId: mockToken1.ledgerCanisterId, isIcrc2Supported: true });

			expect(get(isSourceTokenIcrc2)).toBeTruthy();
		});

		it('should return correct value when sourceToken changes', () => {
			const { isSourceTokenIcrc2, setIsTokensIcrc2, setSourceToken } = initSwapContext({
				sourceToken: mockToken1
			});

			setIsTokensIcrc2({ ledgerCanisterId: mockToken1.ledgerCanisterId, isIcrc2Supported: true });
			setIsTokensIcrc2({ ledgerCanisterId: mockToken2.ledgerCanisterId, isIcrc2Supported: false });

			expect(get(isSourceTokenIcrc2)).toBeTruthy();

			setSourceToken(mockToken2);

			expect(get(isSourceTokenIcrc2)).toBeFalsy();
		});

		it('should return undefined for uncached token', () => {
			const { isSourceTokenIcrc2, setIsTokensIcrc2, setSourceToken } = initSwapContext({
				sourceToken: mockToken1
			});

			setIsTokensIcrc2({ ledgerCanisterId: mockToken1.ledgerCanisterId, isIcrc2Supported: true });

			expect(get(isSourceTokenIcrc2)).toBeTruthy();

			setSourceToken(mockToken2);

			expect(get(isSourceTokenIcrc2)).toBeUndefined();
		});

		it('should preserve cache when switching tokens back and forth', () => {
			const { isSourceTokenIcrc2, setIsTokensIcrc2, switchTokens } = initSwapContext({
				sourceToken: mockToken1,
				destinationToken: mockToken2
			});

			setIsTokensIcrc2({ ledgerCanisterId: mockToken1.ledgerCanisterId, isIcrc2Supported: true });
			setIsTokensIcrc2({ ledgerCanisterId: mockToken2.ledgerCanisterId, isIcrc2Supported: false });

			expect(get(isSourceTokenIcrc2)).toBeTruthy();

			switchTokens();

			expect(get(isSourceTokenIcrc2)).toBeFalsy();

			switchTokens();

			expect(get(isSourceTokenIcrc2)).toBeTruthy();
		});
	});

	describe('isSourceTokenPermitSupported', () => {
		it('should initialize with empty values', () => {
			const { isSourceTokenPermitSupported } = initSwapContext({
				sourceToken: mockValidErc20Token
			});

			expect(get(isSourceTokenPermitSupported)).toBeUndefined();
		});

		it('should return undefined when sourceToken is not set', () => {
			const { isSourceTokenPermitSupported } = initSwapContext();

			expect(get(isSourceTokenPermitSupported)).toBeUndefined();
		});

		it('should cache isPermitSupported status', () => {
			const { isSourceTokenPermitSupported, setIsTokenPermitSupported } = initSwapContext({
				sourceToken: mockValidErc20Token
			});

			expect(get(isSourceTokenPermitSupported)).toBeUndefined();

			setIsTokenPermitSupported({ address: mockValidErc20Token.address, isPermitSupported: true });

			expect(get(isSourceTokenPermitSupported)).toBeTruthy();
		});

		it('should update isSourceTokenSupportsPermit when cache changes', () => {
			const { isSourceTokenPermitSupported, setIsTokenPermitSupported } = initSwapContext({
				sourceToken: mockValidErc20Token
			});

			setIsTokenPermitSupported({ address: mockValidErc20Token.address, isPermitSupported: false });

			expect(get(isSourceTokenPermitSupported)).toBeFalsy();

			setIsTokenPermitSupported({ address: mockValidErc20Token.address, isPermitSupported: true });

			expect(get(isSourceTokenPermitSupported)).toBeTruthy();
		});

		it('should return correct value when sourceToken changes', () => {
			const { isSourceTokenPermitSupported, setIsTokenPermitSupported, setSourceToken } =
				initSwapContext({
					sourceToken: mockValidErc20Token
				});

			setIsTokenPermitSupported({ address: PEPE_TOKEN.address, isPermitSupported: true });
			setIsTokenPermitSupported({ address: mockValidErc20Token.address, isPermitSupported: false });

			setSourceToken(PEPE_TOKEN);

			expect(get(isSourceTokenPermitSupported)).toBeTruthy();

			setSourceToken(mockValidErc20Token);

			expect(get(isSourceTokenPermitSupported)).toBeFalsy();
		});

		it('should return undefined for uncached token', () => {
			const { isSourceTokenPermitSupported, setIsTokenPermitSupported, setSourceToken } =
				initSwapContext({
					sourceToken: PEPE_TOKEN
				});

			setIsTokenPermitSupported({ address: PEPE_TOKEN.address, isPermitSupported: true });

			expect(get(isSourceTokenPermitSupported)).toBeTruthy();

			setSourceToken(mockValidErc20Token);

			expect(get(isSourceTokenPermitSupported)).toBeUndefined();
		});
	});
});
