import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import LiquidiumSupplyForm from '$lib/components/liquidium/supply/LiquidiumSupplyForm.svelte';
import { SEND_CONTEXT_KEY, initSendContext, type SendContext } from '$lib/stores/send.store';
import type { LiquidiumMarket } from '$lib/types/liquidium';
import en from '$tests/mocks/i18n.mock';
import { render } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';

describe('LiquidiumSupplyForm', () => {
	const market: LiquidiumMarket = {
		poolId: 'pool-btc',
		asset: 'BTC',
		chain: 'BTC',
		supplyApy: 5,
		borrowApy: 9,
		frozen: false,
		available: true
	};

	const mockContext = () =>
		new Map<symbol, SendContext>([
			[SEND_CONTEXT_KEY, initSendContext({ token: BTC_MAINNET_TOKEN })]
		]);

	const feeDisplay = createRawSnippet(() => ({ render: () => '<span>network fee</span>' }));

	const baseProps = {
		market,
		amount: undefined,
		totalFee: 100n,
		inflowFee: 50n,
		feeDisplay,
		onClose: () => {},
		onNext: () => {}
	};

	it('renders the supply APY, provider fee, collateral info and agreement', () => {
		const { container } = render(LiquidiumSupplyForm, {
			props: baseProps,
			context: mockContext()
		});

		expect(container).toHaveTextContent(en.liquidium.text.supply_apy);
		expect(container).toHaveTextContent(en.liquidium.text.provider_fee);
		expect(container).toHaveTextContent(en.liquidium.text.supply_collateral_info);
		expect(container).toHaveTextContent(en.liquidium.text.supply_agreement);
	});

	it('still renders while the provider fee is unresolved (fee-missing branch)', () => {
		const { container } = render(LiquidiumSupplyForm, {
			props: { ...baseProps, inflowFee: undefined },
			context: mockContext()
		});

		expect(container).toHaveTextContent(en.liquidium.text.supply_apy);
	});

	it('surfaces an amount error from the custom validator', () => {
		const { container } = render(LiquidiumSupplyForm, {
			props: {
				...baseProps,
				amount: 1,
				onCustomErrorValidate: () => new Error(en.liquidium.text.insufficient_funds_for_fee)
			},
			context: mockContext()
		});

		expect(container).toHaveTextContent(en.liquidium.text.insufficient_funds_for_fee);
	});

	it('renders a valid amount with no custom validator', () => {
		const { container } = render(LiquidiumSupplyForm, {
			props: { ...baseProps, amount: 1 },
			context: mockContext()
		});

		expect(container).toHaveTextContent(en.liquidium.text.supply_apy);
	});

	it('keeps the form valid when the custom validator returns no error', () => {
		const { container } = render(LiquidiumSupplyForm, {
			props: { ...baseProps, amount: 1, onCustomErrorValidate: () => undefined },
			context: mockContext()
		});

		expect(container).not.toHaveTextContent(en.liquidium.text.insufficient_funds_for_fee);
	});
});
