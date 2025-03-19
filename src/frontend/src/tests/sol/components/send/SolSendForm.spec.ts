import { TRUMP_TOKEN } from '$env/tokens/tokens-spl/tokens.trump.env';
import { SOLANA_TOKEN } from '$env/tokens/tokens.sol.env';
import { TOKEN_INPUT_CURRENCY_TOKEN } from '$lib/constants/test-ids.constants';
import { SEND_CONTEXT_KEY, initSendContext } from '$lib/stores/send.store';
import * as solanaApi from '$sol/api/solana.api';
import SolSendForm from '$sol/components/send/SolSendForm.svelte';
import { SOL_FEE_CONTEXT_KEY, initFeeContext, initFeeStore } from '$sol/stores/sol-fee.store';
import * as solAddressUtils from '$sol/utils/sol-address.utils';
import { mockAtaAddress, mockSolAddress } from '$tests/mocks/sol.mock';
import { render } from '@testing-library/svelte';
import { writable } from 'svelte/store';

describe('SolSendForm', () => {
	const mockContext = new Map([]);

	const mockFeeStore = initFeeStore();
	const mockPrioritizationFeeStore = initFeeStore();
	const mockAtaFeeStore = initFeeStore();

	const props = {
		destination: mockAtaAddress,
		amount: 22_000,
		source: mockSolAddress
	};

	const amountSelector = `input[data-tid="${TOKEN_INPUT_CURRENCY_TOKEN}"]`;
	const destinationSelector = 'input[data-tid="destination-input"]';
	const networkSelector = 'div[id="network"]';
	const feeSelector = 'p[id="fee"]';
	const ataFeeSelector = 'p[id="ataFee"]';
	const toolbarSelector = 'div[data-tid="toolbar"]';

	beforeEach(() => {
		vi.clearAllMocks();
		vi.resetAllMocks();

		vi.spyOn(solanaApi, 'estimatePriorityFee').mockResolvedValue(0n);

		mockFeeStore.setFee(123n);
		mockPrioritizationFeeStore.setFee(3n);
		mockAtaFeeStore.setFee(undefined);

		mockContext.set(
			SOL_FEE_CONTEXT_KEY,
			initFeeContext({
				feeStore: mockFeeStore,
				prioritizationFeeStore: mockPrioritizationFeeStore,
				ataFeeStore: mockAtaFeeStore,
				feeSymbolStore: writable(SOLANA_TOKEN.symbol),
				feeDecimalsStore: writable(SOLANA_TOKEN.decimals)
			})
		);
	});

	it('should render all fields', () => {
		mockContext.set(
			SEND_CONTEXT_KEY,
			initSendContext({
				sendPurpose: 'send',
				token: SOLANA_TOKEN
			})
		);

		const { container } = render(SolSendForm, {
			props,
			context: mockContext
		});

		const amount: HTMLInputElement | null = container.querySelector(amountSelector);
		expect(amount).not.toBeNull();

		const destination: HTMLInputElement | null = container.querySelector(destinationSelector);
		expect(destination).not.toBeNull();

		const network: HTMLDivElement | null = container.querySelector(networkSelector);
		expect(network).not.toBeNull();

		const fee: HTMLParagraphElement | null = container.querySelector(feeSelector);
		expect(fee).not.toBeNull();

		const toolbar: HTMLDivElement | null = container.querySelector(toolbarSelector);
		expect(toolbar).not.toBeNull();
	});

	describe('with SPL token', () => {
		beforeEach(() => {
			vi.clearAllMocks();
			vi.resetAllMocks();

			mockContext.set(
				SEND_CONTEXT_KEY,
				initSendContext({
					sendPurpose: 'send',
					token: TRUMP_TOKEN
				})
			);

			vi.spyOn(solAddressUtils, 'isAtaAddress').mockResolvedValue(true);
		});

		it('should not render ATA creation fee if the destination is empty', () => {
			const { container } = render(SolSendForm, {
				props: { ...props, destination: '' },
				context: mockContext
			});

			const ataFee: HTMLParagraphElement | null = container.querySelector(ataFeeSelector);
			expect(ataFee).toBeNull();
		});

		it('should render ATA creation fee if it is not nullish', async () => {
			const { container } = render(SolSendForm, {
				props,
				context: mockContext
			});

			mockAtaFeeStore.setFee(123n);

			// Wait for the fee to be loaded
			await new Promise((resolve) => setTimeout(resolve, 100));

			const ataFee: HTMLParagraphElement | null = container.querySelector(ataFeeSelector);
			expect(ataFee).not.toBeNull();
		});

		it('should not render ATA creation fee if it is nullish', async () => {
			mockAtaFeeStore.setFee(123n);

			const { container } = render(SolSendForm, {
				props,
				context: mockContext
			});

			mockAtaFeeStore.setFee(undefined);

			// Wait for the fee to be loaded
			await new Promise((resolve) => setTimeout(resolve, 5000));

			const ataFee: HTMLParagraphElement | null = container.querySelector(ataFeeSelector);
			expect(ataFee).toBeNull();
		}, 60000);
	});
});
