import OisyTradeProviderHero from '$lib/components/trading/OisyTradeProviderHero.svelte';
import { setPrivacyMode } from '$lib/utils/privacy.utils';
import en from '$tests/mocks/i18n.mock';
import { fireEvent, render } from '@testing-library/svelte';

const { depositableMock, freeMock, reservedMock, usdMock } = vi.hoisted(() => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { writable: createWritable } = require('svelte/store');
	return {
		depositableMock: createWritable(0),
		freeMock: createWritable(0),
		reservedMock: createWritable(0),
		usdMock: createWritable(0)
	};
});

// Isolate the hero from the data layer: drive the four fiat figures directly.
vi.mock(import('$lib/derived/oisy-trade.derived'), async (importOriginal) => ({
	...(await importOriginal()),
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
	afterNavigate: vi.fn(),
	goto: vi.fn()
}));

describe('OisyTradeProviderHero', () => {
	beforeEach(() => {
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

		const { getByText } = render(OisyTradeProviderHero, { props: { onDeposit } });

		await fireEvent.click(getByText(en.trading.page.deposit));

		expect(onDeposit).toHaveBeenCalledOnce();
	});
});
