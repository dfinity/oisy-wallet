import type {
	Token as TradeToken,
	UserTokenBalance
} from '$declarations/oisy_trade/oisy_trade.did';
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
import { mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import { Principal } from '@icp-sdk/core/principal';
import { render } from '@testing-library/svelte';
import { tick } from 'svelte';
import { get } from 'svelte/store';

const { mockPairs, mockEnabledIcTokens, mockBalances } = vi.hoisted(() => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { writable } = require('svelte/store');
	return {
		mockPairs: writable([]),
		mockEnabledIcTokens: writable([]),
		mockBalances: writable([])
	};
});

vi.mock('$lib/derived/oisy-trade.derived', () => ({
	oisyTradePairs: mockPairs,
	oisyTradeBalances: mockBalances
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

	const balanceOf = ({ ledgerId, free }: { ledgerId: string; free: bigint }): UserTokenBalance =>
		({
			token: { id: { ledger_id: Principal.fromText(ledgerId) } },
			balance: { free, reserved: ZERO }
		}) as unknown as UserTokenBalance;

	const icpPair = {
		base: tradeToken({ symbol: 'ICP', ledgerId: icpLedgerId }),
		quote: tradeToken({ symbol: 'ckUSDC', ledgerId: ckusdcLedgerId })
	};
	const enabledIcpCkusdc = [
		icToken({ symbol: 'ICP', ledgerId: icpLedgerId }),
		icToken({ symbol: 'ckUSDC', ledgerId: ckusdcLedgerId })
	];

	const mockContext = (tokens = [ICP_TOKEN]) =>
		new Map([[MODAL_TOKENS_LIST_CONTEXT_KEY, initModalTokensListContext({ tokens })]]);

	beforeEach(() => {
		mockPairs.set([]);
		mockEnabledIcTokens.set([]);
		mockBalances.set([]);
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
		mockBalances.set([balanceOf({ ledgerId: icpLedgerId, free: 1_000_000n })]);

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

	it('drops non-deposited tokens from the spend leg', async () => {
		mockPairs.set([icpPair]);
		mockEnabledIcTokens.set(enabledIcpCkusdc);
		// No deposit → the Sell (spend) base list is empty.
		mockBalances.set([]);

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
		mockBalances.set([]);

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
