import BalanceDisplay from '$lib/components/exchange/ExchangeAmountDisplay.svelte';
import { formatUSD } from '$lib/utils/format.utils';
import en from '$tests/mocks/i18n.mock';
import { render } from '@testing-library/svelte';
import { getContext } from 'svelte';
import { vi } from 'vitest';

// ─── Mocks ────────────────────────────────────────────────
vi.mock('$lib/derived/balances.derived', () => ({
	allBalancesZero: { subscribe: vi.fn((fn) => fn(false)) }
}));
vi.mock('$lib/derived/network-tokens.derived', () => ({
	combinedDerivedSortedNetworkTokensUi: {}
}));
vi.mock('$lib/stores/i18n.store', () => ({
	i18n: {
		subscribe: vi.fn((fn) => fn(en))
	}
}));
vi.mock('$lib/utils/format.utils', () => ({
	formatUSD: ({ value }: { value: number }) => `$${value.toFixed(2)}`
}));
vi.mock('$lib/utils/tokens.utils', () => ({
	sumTokensUiUsdBalance: () => 123.45
}));
vi.mock('svelte', async (original) => {
	const actual = await original();
	return {
		...actual,
		getContext: vi.fn(() => ({
			loaded: { subscribe: vi.fn((fn) => fn(true)) }
		}))
	};
});

// ─── Tests ─────────────────────────────────────────────────
describe('BalanceDisplay', () => {
	const balanceValue = 123.45;
	const formatted = formatUSD({ value: balanceValue });

	it('renders formatted USD balance when loaded and not hidden', () => {
		const { getByText } = render(BalanceDisplay, { props: { hideBalance: false } });

		expect(getByText(formatted)).toBeInTheDocument();
		expect(getByText(en.hero.text.available_balance)).toBeInTheDocument();
	});

	it('renders dots and "hidden balance" label when hidden', () => {
		const { getByText, container } = render(BalanceDisplay, { props: { hideBalance: true } });

		expect(container.querySelector('svg')).toBeTruthy(); // IconDots
		expect(getByText(en.hero.text.hidden_balance)).toBeInTheDocument();
	});

	it('renders $0.00 if not loaded and balance visible', () => {
		(getContext as any).mockReturnValueOnce({
			loaded: { subscribe: vi.fn((fn) => fn(false)) }
		});
		const { getByText } = render(BalanceDisplay, { props: { hideBalance: false } });

		expect(getByText('$0.00')).toBeInTheDocument();
		expect(getByText(en.hero.text.available_balance)).toBeInTheDocument();
	});

	it('renders dots if not loaded and balance is hidden', () => {
		(getContext as any).mockReturnValueOnce({
			loaded: { subscribe: vi.fn((fn) => fn(false)) }
		});
		const { container, getByText } = render(BalanceDisplay, { props: { hideBalance: true } });

		expect(container.querySelector('svg')).toBeTruthy();
		expect(getByText(en.hero.text.hidden_balance)).toBeInTheDocument();
	});

	it('shows "Top up" if all balances are zero', async () => {
		const mocked = await import('$lib/derived/balances.derived');
		vi.mocked(mocked.allBalancesZero.subscribe).mockImplementationOnce((fn) => fn(true));

		const { getByText } = render(BalanceDisplay, { props: { hideBalance: false } });

		expect(getByText(en.hero.text.top_up)).toBeInTheDocument();
	});
});
