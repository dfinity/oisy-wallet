import * as btcPendingSentTransactionsServices from '$btc/services/btc-pending-sent-transactions.services';
import * as btcSendServices from '$btc/services/btc-send.services';
import * as btcUtxosService from '$btc/services/btc-utxos.service';
import { allUtxosStore } from '$btc/stores/all-utxos.store';
import { btcPendingSentTransactionsStore } from '$btc/stores/btc-pending-sent-transactions.store';
import { feeRatePercentilesStore } from '$btc/stores/fee-rate-percentiles.store';
import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import * as bitcoinApi from '$icp/api/bitcoin.api';
import LiquidiumRepayBtcWizard from '$lib/components/liquidium/repay/LiquidiumRepayBtcWizard.svelte';
import { ZERO } from '$lib/constants/app.constants';
import * as addressesStore from '$lib/derived/address.derived';
import { ProgressStepsLiquidiumRepay } from '$lib/enums/progress-steps';
import { WizardStepsLiquidiumRepay } from '$lib/enums/wizard-steps';
import type { LiquidiumPortfolio, LiquidiumReserve } from '$lib/types/liquidium';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { mockBtcAddress, mockUtxosFee } from '$tests/mocks/btc.mock';
import en from '$tests/mocks/i18n.mock';
import { mockContextMap } from '$tests/utils/context.test-utils';
import { mockSendContextEntry } from '$tests/utils/send.context.test-utils';
import type { WizardStep } from '@dfinity/gix-components';
import { render } from '@testing-library/svelte';
import { readable } from 'svelte/store';

describe('LiquidiumRepayBtcWizard', () => {
	const reserve: LiquidiumReserve = {
		poolId: 'pool-btc',
		asset: 'BTC',
		chain: 'BTC',
		supplyApy: 0,
		borrowApy: 9,
		deposited: ZERO,
		depositedDecimals: 8,
		borrowed: 100_000_000n,
		borrowedDecimals: 8,
		debtInterest: 500_000n,
		suppliedUsd: 0,
		borrowedUsd: 1_000
	};

	const portfolio: LiquidiumPortfolio = {
		reserves: [reserve],
		totalSuppliedUsd: 4_000,
		totalBorrowedUsd: 1_000,
		netValueUsd: 3_000,
		availableBorrowsUsd: 2_000,
		weightedLiquidationThresholdBps: 8_000,
		healthFactorPercent: 75
	};

	const context = () => mockContextMap([mockSendContextEntry({ token: BTC_MAINNET_TOKEN })]);

	const step = (name: WizardStepsLiquidiumRepay): WizardStep => ({ name, title: name });

	const baseProps = {
		reserve,
		portfolio,
		amount: 0.5,
		repayProgressStep: ProgressStepsLiquidiumRepay.INITIALIZATION,
		maxRepay: 100_000_000n,
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

	it('renders the form step with the debt breakdown', () => {
		const { container } = render(LiquidiumRepayBtcWizard, {
			props: { ...baseProps, currentStep: step(WizardStepsLiquidiumRepay.REPAY) },
			context: context()
		});

		expect(container).toHaveTextContent(en.liquidium.text.current_debt);
	});

	it('renders the review step', () => {
		const { container } = render(LiquidiumRepayBtcWizard, {
			props: { ...baseProps, currentStep: step(WizardStepsLiquidiumRepay.REVIEW) },
			context: context()
		});

		expect(container).toHaveTextContent(en.liquidium.text.current_debt);
	});

	it('renders the progress step', () => {
		const { container } = render(LiquidiumRepayBtcWizard, {
			props: { ...baseProps, currentStep: step(WizardStepsLiquidiumRepay.REPAYING) },
			context: context()
		});

		expect(container).toHaveTextContent(en.liquidium.text.starting_to_repay);
	});
});