import OisyTradeProviderHero from '$lib/components/trading/OisyTradeProviderHero.svelte';
import { ROUTE_ID_GROUP_APP } from '$lib/constants/routes.constants';
import { setPrivacyMode } from '$lib/utils/privacy.utils';
import en from '$tests/mocks/i18n.mock';
import type { NavigationTarget } from '@sveltejs/kit';
import { fireEvent, render } from '@testing-library/svelte';
import { tick } from 'svelte';

const { afterNavigateMock, assetsMock, depositableMock, freeMock, reservedMock, usdMock } =
	vi.hoisted(() => {
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		const { writable: createWritable } = require('svelte/store');
		return {
			afterNavigateMock: vi.fn(),
			assetsMock: createWritable([]),
			depositableMock: createWritable(0),
			freeMock: createWritable(0),
			reservedMock: createWritable(0),
			usdMock: createWritable(0)
		};
	});

// Isolate the hero from the data layer: drive the four fiat figures directly.
vi.mock(import('$lib/derived/oisy-trade.derived'), async (importOriginal) => ({
	...(await importOriginal()),
	get oisyTradeAssets() {
		return assetsMock;
	},
	get oisyTradeDepositableUsdValue() {
		return depositableMock;
	},
	get oisyTradeFreeUsdValue() {
		return freeMock;
	},
	get oisyTradeReservedUsdValue() {
		return reservedMock;
	},
	get oisyTradeUsdValue() {
		return usdMock;
	}
}));

vi.mock('$app/navigation', () => ({
	afterNavigate: afterNavigateMock,
	goto: vi.fn()
}));

// Simulate arriving from a given route by invoking the handler the component
// registered with afterNavigate, mirroring SvelteKit's post-navigation call.
const navigateFrom = async (routeId: string | null) => {
	const from: NavigationTarget | null =
		routeId === null ? null : ({ route: { id: routeId } } as NavigationTarget);
	const handler = afterNavigateMock.mock.calls.at(-1)?.[0];
	handler?.({ from });
	await tick();
};

describe('OisyTradeProviderHero', () => {
	beforeEach(() => {
		afterNavigateMock.mockClear();
		assetsMock.set([]);
		depositableMock.set(0);
		freeMock.set(0);
		reservedMock.set(0);
		usdMock.set(0);
		setPrivacyMode({ enabled: false });
	});

	it('renders the venue identity, tagline and both metric labels', () => {
		const { getByText, container } = render(OisyTradeProviderHero);

		expect(getByText(en.trading.text.provider_name)).toBeInTheDocument();
		expect(container).toHaveTextContent(en.trading.page.tagline);
		expect(getByText(en.trading.page.trading_potential)).toBeInTheDocument();
		expect(getByText(en.trading.page.deposited_assets)).toBeInTheDocument();
	});

	it('shows the "nothing deposited" sub-line when there are no deposits', () => {
		const { getByText } = render(OisyTradeProviderHero);

		expect(getByText(en.trading.page.deposited_empty)).toBeInTheDocument();
	});

	it('shows the "all free" sub-line when deposited but nothing is reserved', () => {
		assetsMock.set([{ total: 100n }]);
		usdMock.set(100);
		freeMock.set(100);
		reservedMock.set(0);

		const { getByText } = render(OisyTradeProviderHero);

		expect(getByText(en.trading.page.deposited_all_free)).toBeInTheDocument();
	});

	it('shows the free / in-orders breakdown when funds are reserved', () => {
		usdMock.set(100);
		freeMock.set(60);
		reservedMock.set(40);

		const { container } = render(OisyTradeProviderHero);

		// Both the "free" and "in orders" copy render (amounts resolved via placeholders).
		expect(container).toHaveTextContent('in orders');
		expect(container).not.toHaveTextContent(en.trading.page.deposited_empty);
	});

	it('hides the sub-line copy under privacy mode', () => {
		usdMock.set(100);
		freeMock.set(60);
		reservedMock.set(40);
		setPrivacyMode({ enabled: true });

		const { queryByText, getByText } = render(OisyTradeProviderHero);

		// Labels stay; the masked figures replace the free/in-orders text.
		expect(getByText(en.trading.page.trading_potential)).toBeInTheDocument();
		expect(queryByText(en.trading.page.deposited_all_free)).toBeNull();
	});

	it('calls onDeposit when the Deposit button is clicked', async () => {
		const onDeposit = vi.fn();

		const { getByText } = render(OisyTradeProviderHero, {
			props: { onDeposit, onWithdraw: vi.fn() }
		});

		await fireEvent.click(getByText(en.trading.page.deposit));

		expect(onDeposit).toHaveBeenCalledOnce();
	});

	it('disables Withdraw when there are no deposits', () => {
		const { getByRole } = render(OisyTradeProviderHero, {
			props: { onDeposit: vi.fn(), onWithdraw: vi.fn() }
		});

		expect(getByRole('button', { name: en.trading.page.withdraw })).toBeDisabled();
	});

	it('scrolls to the info box when Learn more is clicked', async () => {
		const scrollIntoView = vi.fn();
		const getElementById = vi
			.spyOn(document, 'getElementById')
			.mockReturnValue({ scrollIntoView } as unknown as HTMLElement);

		const { getByText } = render(OisyTradeProviderHero, {
			props: { onDeposit: vi.fn(), onWithdraw: vi.fn() }
		});

		await fireEvent.click(getByText(en.core.text.learn_more));

		expect(getElementById).toHaveBeenCalledWith('oisy-trade-info');
		expect(scrollIntoView).toHaveBeenCalled();

		getElementById.mockRestore();
	});

	it('enables Withdraw and calls onWithdraw once deposited', async () => {
		assetsMock.set([{ total: 100n }]);
		const onWithdraw = vi.fn();

		const { getByRole } = render(OisyTradeProviderHero, {
			props: { onDeposit: vi.fn(), onWithdraw }
		});

		const button = getByRole('button', { name: en.trading.page.withdraw });

		expect(button).not.toBeDisabled();

		await fireEvent.click(button);

		expect(onWithdraw).toHaveBeenCalledOnce();
	});

	describe('back arrow', () => {
		const tradingRouteId = `${ROUTE_ID_GROUP_APP}/trading`;

		it('is hidden by default (page opened as a top-level destination)', () => {
			const { queryByRole } = render(OisyTradeProviderHero);

			expect(queryByRole('button', { name: en.core.text.back })).toBeNull();
		});

		it('stays hidden when arriving from a non-trading route', async () => {
			const { queryByRole } = render(OisyTradeProviderHero);

			await navigateFrom(`${ROUTE_ID_GROUP_APP}/tokens`);

			expect(queryByRole('button', { name: en.core.text.back })).toBeNull();
		});

		it('appears when arriving from the Assets → Trading tab', async () => {
			const { queryByRole } = render(OisyTradeProviderHero);

			await navigateFrom(tradingRouteId);

			expect(queryByRole('button', { name: en.core.text.back })).toBeInTheDocument();
		});

		it('pops history back to the Trading tab when clicked', async () => {
			const historyBack = vi.spyOn(history, 'back').mockImplementation(() => {});

			const { getByRole } = render(OisyTradeProviderHero);

			await navigateFrom(tradingRouteId);

			await fireEvent.click(getByRole('button', { name: en.core.text.back }));

			expect(historyBack).toHaveBeenCalledOnce();

			historyBack.mockRestore();
		});
	});
});
