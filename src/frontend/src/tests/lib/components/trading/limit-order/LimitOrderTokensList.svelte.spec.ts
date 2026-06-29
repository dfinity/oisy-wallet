import type { Token as TradeToken } from '$declarations/oisy_trade/oisy_trade.did';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import type { IcToken } from '$icp/types/ic-token';
import LimitOrderTokensList from '$lib/components/trading/limit-order/LimitOrderTokensList.svelte';
import { MODAL_TOKENS_LIST } from '$lib/constants/test-ids.constants';
import {
	initModalTokensListContext,
	MODAL_TOKENS_LIST_CONTEXT_KEY,
	type ModalTokensListContext
} from '$lib/stores/modal-tokens-list.store';
import { mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import { Principal } from '@icp-sdk/core/principal';
import { render } from '@testing-library/svelte';
import { get } from 'svelte/store';

const { mockPairs, mockEnabledIcTokens } = vi.hoisted(() => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { writable } = require('svelte/store');
	return {
		mockPairs: writable([]),
		mockEnabledIcTokens: writable([])
	};
});

vi.mock('$lib/derived/oisy-trade.derived', () => ({
	oisyTradePairs: mockPairs
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

	const mockContext = (tokens = [ICP_TOKEN]) =>
		new Map([[MODAL_TOKENS_LIST_CONTEXT_KEY, initModalTokensListContext({ tokens })]]);

	beforeEach(() => {
		mockPairs.set([]);
		mockEnabledIcTokens.set([]);
	});

	it('renders the shared modal tokens list', () => {
		const { getByTestId } = render(LimitOrderTokensList, {
			props: { mode: 'base', onSelect: () => {}, onCancel: () => {} },
			context: mockContext()
		});

		expect(getByTestId(MODAL_TOKENS_LIST)).toBeInTheDocument();
	});

	it('seeds the picker with base symbols resolved to enabled IC tokens', async () => {
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

		const context = mockContext([]);
		const ctx = context.get(MODAL_TOKENS_LIST_CONTEXT_KEY) as ModalTokensListContext;

		render(LimitOrderTokensList, {
			props: { mode: 'base', onSelect: () => {}, onCancel: () => {} },
			context
		});

		// The component's effect resolves the base symbols and pushes them through
		// `setTokens`; the picker's filtered list then exposes the ICP token.
		await new Promise((resolve) => setTimeout(resolve, 0));

		const filtered = get(ctx.filteredTokens);

		expect(filtered.some((token: { symbol: string }) => token.symbol === 'ICP')).toBeTruthy();
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
			props: { mode: 'quote', baseSymbol: 'ICP', onSelect: () => {}, onCancel: () => {} },
			context: mockContext([])
		});

		expect(getByTestId(MODAL_TOKENS_LIST)).toBeInTheDocument();
	});
});
