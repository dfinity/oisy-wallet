import type { Token as TradeToken } from '$declarations/oisy_trade/oisy_trade.did';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import type { IcToken } from '$icp/types/ic-token';
import LimitOrderTokensList from '$lib/components/trading/limit-order/LimitOrderTokensList.svelte';
import { ZERO } from '$lib/constants/app.constants';
import { MODAL_TOKENS_LIST } from '$lib/constants/test-ids.constants';
import {
	initModalTokensListContext,
	MODAL_TOKENS_LIST_CONTEXT_KEY,
	type ModalTokensListContext
} from '$lib/stores/modal-tokens-list.store';
import type { OisyTradeAsset } from '$lib/types/oisy-trade';
import { mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import { Principal } from '@icp-sdk/core/principal';
import { render } from '@testing-library/svelte';
import { tick } from 'svelte';
import { get } from 'svelte/store';

const { mockPairs, mockEnabledIcTokens, mockAssets } = vi.hoisted(() => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { writable } = require('svelte/store');
	return {
		mockPairs: writable([]),
		mockEnabledIcTokens: writable([]),
		mockAssets: writable([])
	};
});

vi.mock('$lib/derived/oisy-trade.derived', () => ({
	oisyTradePairs: mockPairs,
	oisyTradeAssets: mockAssets
}));

vi.mock(import('$lib/derived/tokens.derived'), async (importOriginal) => {
	const actual = await importOriginal();
	return {
		...actual,
		enabledIcTokens: mockEnabledIcTokens
	};
});

describe('LimitOrderTokensList', () => {
	const icpLedgerId = 'ryjl3-tyaaa-aaaaa-aaaba-cai';
	const ckusdcLedgerId = 'xevnm-gaaaa-aaaar-qafnq-cai';

	const tradeToken = ({ symbol, ledgerId }: { symbol: string; ledgerId: string }): TradeToken =>
		({
			id: { ledger_id: Principal.fromText(ledgerId) },
			metadata: { symbol, decimals: 8 }
		}) as unknown as TradeToken;

	const icToken = ({ symbol, ledgerId }: { symbol: string; ledgerId: string }): IcToken => ({
		...mockValidIcToken,
		symbol,
		ledgerCanisterId: ledgerId
	});

	const assetOf = ({
		symbol,
		ledgerId,
		free
	}: {
		symbol: string;
		ledgerId: string;
		free: bigint;
	}): OisyTradeAsset => ({
		token: icToken({ symbol, ledgerId }),
		free,
		reserved: ZERO,
		total: free,
		totalUsd: undefined,
		freeUsd: undefined
	});

	const icpPair = {
		base: tradeToken({ symbol: 'ICP', ledgerId: icpLedgerId }),
		quote: tradeToken({ symbol: 'ckUSDC', ledgerId: ckusdcLedgerId })
	};
	const enabledIcpCkusdc = [
		icToken({ symbol: 'ICP', ledgerId: icpLedgerId }),
		icToken({ symbol: 'ckUSDC', ledgerId: ckusdcLedgerId })
	];

	const mockContext = (tokens = [ICP_TOKEN]) =>
		new Map([
			[
				MODAL_TOKENS_LIST_CONTEXT_KEY,
				// `sortByBalance: false` mirrors `LimitOrderModal`: without it the shared
				// picker re-maps every token against the wallet balances store, which is
				// exactly the regression this component's balance override guards against.
				initModalTokensListContext({ tokens, sortByBalance: false })
			]
		]);

	beforeEach(() => {
		mockPairs.set([]);
		mockEnabledIcTokens.set([]);
		mockAssets.set([]);
	});

	it('renders the shared modal tokens list', () => {
		const { getByTestId } = render(LimitOrderTokensList, {
			props: { mode: 'base', side: 'sell', onSelect: () => {}, onCancel: () => {} },
			context: mockContext()
		});

		expect(getByTestId(MODAL_TOKENS_LIST)).toBeInTheDocument();
	});

	it('seeds the spend leg with deposited base symbols resolved to enabled IC tokens', async () => {
		mockPairs.set([icpPair]);
		mockEnabledIcTokens.set(enabledIcpCkusdc);
		// A Sell spends the base, so it must be deposited to appear.
		mockAssets.set([assetOf({ symbol: 'ICP', ledgerId: icpLedgerId, free: 1_000_000n })]);

		const context = mockContext([]);
		const ctx = context.get(MODAL_TOKENS_LIST_CONTEXT_KEY) as ModalTokensListContext;

		render(LimitOrderTokensList, {
			props: { mode: 'base', side: 'sell', onSelect: () => {}, onCancel: () => {} },
			context
		});

		// The component's effect resolves the base symbols and pushes them through
		// `setTokens`; the picker's filtered list then exposes the ICP token.
		await tick();

		const filtered = get(ctx.filteredTokens);

		expect(filtered.some((token: { symbol: string }) => token.symbol === 'ICP')).toBeTruthy();
	});

	it('shows the deposited (free) balance, not the wallet balance, for the spend leg', async () => {
		mockPairs.set([icpPair]);
		mockEnabledIcTokens.set(enabledIcpCkusdc);
		// Deposited balance differs from whatever the (unmocked) wallet balances
		// store may hold — the picker must surface this one, not the wallet's.
		const depositedFree = 1_000_000n;
		mockAssets.set([assetOf({ symbol: 'ICP', ledgerId: icpLedgerId, free: depositedFree })]);

		const context = mockContext([]);
		const ctx = context.get(MODAL_TOKENS_LIST_CONTEXT_KEY) as ModalTokensListContext;

		render(LimitOrderTokensList, {
			props: { mode: 'base', side: 'sell', onSelect: () => {}, onCancel: () => {} },
			context
		});

		await tick();

		const icp = get(ctx.filteredTokens).find(
			(token: { symbol: string }) => token.symbol === 'ICP'
		) as { balance?: bigint } | undefined;

		expect(icp?.balance).toBe(depositedFree);
	});

	it('drops non-deposited tokens from the spend leg', async () => {
		mockPairs.set([icpPair]);
		mockEnabledIcTokens.set(enabledIcpCkusdc);
		// No deposit → the Sell (spend) base list is empty.
		mockAssets.set([]);

		const context = mockContext([]);
		const ctx = context.get(MODAL_TOKENS_LIST_CONTEXT_KEY) as ModalTokensListContext;

		render(LimitOrderTokensList, {
			props: { mode: 'base', side: 'sell', onSelect: () => {}, onCancel: () => {} },
			context
		});

		await tick();

		expect(
			get(ctx.filteredTokens).some((token: { symbol: string }) => token.symbol === 'ICP')
		).toBeFalsy();
	});

	it('lists the receive leg without requiring a deposit (Buy base)', async () => {
		mockPairs.set([icpPair]);
		mockEnabledIcTokens.set(enabledIcpCkusdc);
		// A Buy receives the base, so it appears even with no DEX balance.
		mockAssets.set([]);

		const context = mockContext([]);
		const ctx = context.get(MODAL_TOKENS_LIST_CONTEXT_KEY) as ModalTokensListContext;

		render(LimitOrderTokensList, {
			props: { mode: 'base', side: 'buy', onSelect: () => {}, onCancel: () => {} },
			context
		});

		await tick();

		expect(
			get(ctx.filteredTokens).some((token: { symbol: string }) => token.symbol === 'ICP')
		).toBeTruthy();
	});

	it('renders for the quote mode', () => {
		mockPairs.set([
			{
				base: tradeToken({ symbol: 'ICP', ledgerId: icpLedgerId }),
				quote: tradeToken({ symbol: 'ckUSDC', ledgerId: ckusdcLedgerId })
			}
		]);
		mockEnabledIcTokens.set([
			icToken({ symbol: 'ICP', ledgerId: icpLedgerId }),
			icToken({ symbol: 'ckUSDC', ledgerId: ckusdcLedgerId })
		]);

		const { getByTestId } = render(LimitOrderTokensList, {
			props: {
				mode: 'quote',
				side: 'buy',
				baseSymbol: 'ICP',
				onSelect: () => {},
				onCancel: () => {}
			},
			context: mockContext([])
		});

		expect(getByTestId(MODAL_TOKENS_LIST)).toBeInTheDocument();
	});
});
