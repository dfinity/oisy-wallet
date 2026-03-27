import BtcUtxosFeeDisplay from '$btc/components/send/BtcUtxosFeeDisplay.svelte';
import {
	initUtxosFeeStore,
	UTXOS_FEE_CONTEXT_KEY,
	type UtxosFeeStore
} from '$btc/stores/utxos-fee.store';
import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { ZERO } from '$lib/constants/app.constants';
import { SEND_CONTEXT_KEY } from '$lib/stores/send.store';
import { formatToken } from '$lib/utils/format.utils';
import en from '$tests/mocks/i18n.mock';
import { render } from '@testing-library/svelte';
import { readable } from 'svelte/store';

describe('BtcUtxosFeeDisplay', () => {
	const mockFeeSatoshis = 1500n;
	const mockExchangeRate = 50000;

	let utxosFeeStore: UtxosFeeStore;

	const mockContext = ({
		utxosFeeStore,
		exchangeRate
	}: {
		utxosFeeStore: UtxosFeeStore;
		exchangeRate?: number;
	}) =>
		new Map([
			[
				SEND_CONTEXT_KEY,
				{
					sendToken: readable(BTC_MAINNET_TOKEN),
					sendTokenDecimals: readable(BTC_MAINNET_TOKEN.decimals),
					sendTokenId: readable(BTC_MAINNET_TOKEN.id),
					sendTokenStandard: readable(BTC_MAINNET_TOKEN.standard),
					sendTokenSymbol: readable(BTC_MAINNET_TOKEN.symbol),
					sendTokenNetworkId: readable(BTC_MAINNET_TOKEN.network.id),
					sendTokenExchangeRate: readable(exchangeRate)
				}
			],
			[UTXOS_FEE_CONTEXT_KEY, { store: utxosFeeStore }]
		]);

	beforeEach(() => {
		vi.clearAllMocks();
		utxosFeeStore = initUtxosFeeStore();
	});

	it('should render the fee amount with correct formatting', () => {
		utxosFeeStore.setUtxosFee({
			utxosFee: {
				feeSatoshis: mockFeeSatoshis,
				utxos: []
			}
		});

		const { container } = render(BtcUtxosFeeDisplay, {
			context: mockContext({ utxosFeeStore })
		});

		const expectedFeeDisplay = formatToken({
			value: mockFeeSatoshis,
			unitName: BTC_MAINNET_TOKEN.decimals,
			displayDecimals: BTC_MAINNET_TOKEN.decimals
		});

		expect(container).toHaveTextContent(expectedFeeDisplay);
		expect(container).toHaveTextContent(BTC_MAINNET_TOKEN.symbol);
	});

	it('should render zero fee when feeSatoshis is zero', () => {
		utxosFeeStore.setUtxosFee({
			utxosFee: {
				feeSatoshis: ZERO,
				utxos: []
			}
		});

		const { container } = render(BtcUtxosFeeDisplay, {
			context: mockContext({ utxosFeeStore })
		});

		const expectedFeeDisplay = formatToken({
			value: ZERO,
			unitName: BTC_MAINNET_TOKEN.decimals,
			displayDecimals: BTC_MAINNET_TOKEN.decimals
		});

		expect(container).toHaveTextContent(expectedFeeDisplay);
	});

	it('should not render fee amount when utxosFee is undefined', () => {
		const { container } = render(BtcUtxosFeeDisplay, {
			context: mockContext({ utxosFeeStore })
		});

		expect(container).toHaveTextContent(en.fee.text.fee);

		const formattedFee = formatToken({
			value: mockFeeSatoshis,
			unitName: BTC_MAINNET_TOKEN.decimals,
			displayDecimals: BTC_MAINNET_TOKEN.decimals
		});

		expect(container).not.toHaveTextContent(formattedFee);
	});

	it('should render fee with exchange rate when provided', () => {
		utxosFeeStore.setUtxosFee({
			utxosFee: {
				feeSatoshis: mockFeeSatoshis,
				utxos: []
			}
		});

		const { container } = render(BtcUtxosFeeDisplay, {
			context: mockContext({ utxosFeeStore, exchangeRate: mockExchangeRate })
		});

		const expectedFeeDisplay = formatToken({
			value: mockFeeSatoshis,
			unitName: BTC_MAINNET_TOKEN.decimals,
			displayDecimals: BTC_MAINNET_TOKEN.decimals
		});

		expect(container).toHaveTextContent(expectedFeeDisplay);
	});
});
