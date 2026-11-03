import { XRP_TOKEN } from '$env/tokens/tokens.xrp.env';
import en from '$tests/mocks/i18n.mock';
import SwapXrpFees from '$xrp/components/swap/SwapXrpFees.svelte';
import {
	initFeeStore,
	initReserveStore,
	initXrpFeeContext,
	XRP_FEE_CONTEXT_KEY
} from '$xrp/stores/xrp-fee.store';
import { render } from '@testing-library/svelte';
import { writable } from 'svelte/store';

describe('SwapXrpFees', () => {
	const renderWithFee = (fee: bigint | undefined) => {
		const feeStore = initFeeStore();
		feeStore.setFee(fee);

		return render(SwapXrpFees, {
			context: new Map([
				[
					XRP_FEE_CONTEXT_KEY,
					initXrpFeeContext({
						feeStore,
						reserveStore: initReserveStore(),
						feeSymbolStore: writable(XRP_TOKEN.symbol),
						feeDecimalsStore: writable(XRP_TOKEN.decimals),
						feeTokenIdStore: writable(XRP_TOKEN.id),
						feeExchangeRateStore: writable(2)
					})
				]
			])
		});
	};

	it('shows the network fee of the deposit', () => {
		const { getByText } = renderWithFee(12n);

		expect(getByText(en.fee.text.network_fee)).toBeInTheDocument();
		expect(getByText('0.000012 XRP', { exact: false })).toBeInTheDocument();
	});

	it('shows nothing while the fee is unknown', () => {
		const { queryByText } = renderWithFee(undefined);

		expect(queryByText(en.fee.text.network_fee)).not.toBeInTheDocument();
	});
});
