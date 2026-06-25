import * as btcPendingSentTransactionsServices from '$btc/services/btc-pending-sent-transactions.services';
import * as btcSendServices from '$btc/services/btc-send.services';
import * as btcUtxosService from '$btc/services/btc-utxos.service';
import { allUtxosStore } from '$btc/stores/all-utxos.store';
import { btcPendingSentTransactionsStore } from '$btc/stores/btc-pending-sent-transactions.store';
import { feeRatePercentilesStore } from '$btc/stores/fee-rate-percentiles.store';
import { convertSatoshisToBtc } from '$btc/utils/btc-send.utils';
import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import * as bitcoinApi from '$icp/api/bitcoin.api';
import LiquidiumSupplyBtcWizard from '$lib/components/liquidium/supply/LiquidiumSupplyBtcWizard.svelte';
import * as addressesStore from '$lib/derived/address.derived';
import { ProgressStepsLiquidiumSupply } from '$lib/enums/progress-steps';
import { WizardStepsLiquidiumSupply } from '$lib/enums/wizard-steps';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { mockBtcAddress, mockUtxo, mockUtxosFee } from '$tests/mocks/btc.mock';
import en from '$tests/mocks/i18n.mock';
import { mockContextMap } from '$tests/utils/context.test-utils';
import { mockSendContextEntry } from '$tests/utils/send.context.test-utils';
import type { WizardStep } from '@dfinity/gix-components';
import { render, waitFor } from '@testing-library/svelte';
import { readable } from 'svelte/store';

describe('LiquidiumSupplyBtcWizard', () => {
	const market = {
		poolId: 'pool-btc',
		asset: 'BTC',
		chain: 'BTC',
		supplyApy: 5,
		borrowApy: 9,
		frozen: false,
		available: true
	};

	const context = () => mockContextMap([mockSendContextEntry({ token: BTC_MAINNET_TOKEN })]);

	const step = (name: WizardStepsLiquidiumSupply): WizardStep => ({ name, title: name });

	const baseProps = {
		market,
		amount: 0.001,
		supplyProgressStep: ProgressStepsLiquidiumSupply.INITIALIZATION,
		inflowFee: 50n,
		onClose: () => {},
		onNext: () => {},
		onBack: () => {}
	};

	beforeEach(() => {
		vi.clearAllMocks();

		allUtxosStore.reset();
		feeRatePercentilesStore.reset();
		btcPendingSentTransactionsStore.reset();

		mockAuthStore();
		vi.spyOn(addressesStore, 'btcAddressMainnet', 'get').mockImplementation(() =>
			readable(mockBtcAddress)
		);
		vi.spyOn(addressesStore, 'ethAddress', 'get').mockImplementation(() => readable(undefined));

		// Stub the UTXO/fee loaders' data sources so they resolve without network calls.
		vi.spyOn(bitcoinApi, 'getUtxosQuery').mockResolvedValue({
			utxos: [],
			tip_block_hash: new Uint8Array(),
			tip_height: 100,
			next_page: []
		});
		vi.spyOn(btcUtxosService, 'prepareBtcSend').mockReturnValue({
			feeSatoshis: mockUtxosFee.feeSatoshis,
			utxos: mockUtxosFee.utxos
		});
		vi.spyOn(btcUtxosService, 'getFeeRateFromPercentiles').mockResolvedValue(1000n);
		vi.spyOn(btcSendServices, 'validateBtcSend').mockResolvedValue(undefined);
		vi.spyOn(
			btcPendingSentTransactionsServices,
			'loadBtcPendingSentTransactions'
		).mockResolvedValue({ success: true });
	});

	it('renders the form step', () => {
		const { container } = render(LiquidiumSupplyBtcWizard, {
			props: { ...baseProps, currentStep: step(WizardStepsLiquidiumSupply.SUPPLY) },
			context: context()
		});

		expect(container).toHaveTextContent(en.liquidium.text.supply_apy);
	});

	it('renders the review step', () => {
		const { container } = render(LiquidiumSupplyBtcWizard, {
			props: { ...baseProps, currentStep: step(WizardStepsLiquidiumSupply.REVIEW) },
			context: context()
		});

		expect(container).toHaveTextContent(en.liquidium.text.supply_apy);
	});

	it('renders the progress step', () => {
		const { container } = render(LiquidiumSupplyBtcWizard, {
			props: { ...baseProps, currentStep: step(WizardStepsLiquidiumSupply.SUPPLYING) },
			context: context()
		});

		expect(container).toHaveTextContent(en.liquidium.text.starting_to_supply);
	});

	it('selects UTXOs for the gross transfer (supply amount + inflow fee)', async () => {
		// The broadcast sends `amount + inflowFee`, so UTXO selection must cover the gross
		// amount — selecting for the net amount alone under-funds the signer (NotEnoughFunds).
		allUtxosStore.setAllUtxos({ allUtxos: [mockUtxo] });
		feeRatePercentilesStore.setFeeRateFromPercentiles({ feeRateFromPercentiles: 1000n });
		btcPendingSentTransactionsStore.setPendingTransactions({
			address: mockBtcAddress,
			pendingTransactions: []
		});

		// 0.001 BTC = 100_000 sat; + 50 sat inflow fee = 100_050 sat → 0.0010005 BTC.
		const grossAmount = Number(convertSatoshisToBtc(100_050n));

		render(LiquidiumSupplyBtcWizard, {
			props: { ...baseProps, currentStep: step(WizardStepsLiquidiumSupply.SUPPLY) },
			context: context()
		});

		await waitFor(() => {
			expect(btcUtxosService.prepareBtcSend).toHaveBeenCalledWith(
				expect.objectContaining({ amount: grossAmount })
			);
		});
	});
});
