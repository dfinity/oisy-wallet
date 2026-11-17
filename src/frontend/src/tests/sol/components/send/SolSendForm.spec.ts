import { TRUMP_TOKEN } from '$env/tokens/tokens-spl/tokens.trump.env';
import { SOLANA_TOKEN } from '$env/tokens/tokens.sol.env';
import { ZERO } from '$lib/constants/app.constants';
import {
	MAX_BUTTON,
	SEND_DESTINATION_SECTION,
	TOKEN_INPUT_CURRENCY_TOKEN
} from '$lib/constants/test-ids.constants';
import { SEND_CONTEXT_KEY, initSendContext } from '$lib/stores/send.store';
import type { OptionAmount } from '$lib/types/send';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import * as solanaApi from '$sol/api/solana.api';
import SolSendForm from '$sol/components/send/SolSendForm.svelte';
import { SOL_FEE_CONTEXT_KEY, initFeeContext, initFeeStore } from '$sol/stores/sol-fee.store';
import * as solAddressUtils from '$sol/utils/sol-address.utils';
import en from '$tests/mocks/i18n.mock';
import { mockSnippet } from '$tests/mocks/snippet.mock';
import { mockAtaAddress, mockSolAddress } from '$tests/mocks/sol.mock';
import SolSendFormTest from '$tests/sol/components/send/SolSendFormTest.svelte';
import { assertNonNullish } from '@dfinity/utils';
import { fireEvent, render } from '@testing-library/svelte';
import { get, writable } from 'svelte/store';

describe('SolSendForm', () => {
	const mockContext = new Map([]);

	const mockFeeStore = initFeeStore();
	const mockPrioritizationFeeStore = initFeeStore();
	const mockAtaFeeStore = initFeeStore();

	const props = {
		destination: mockAtaAddress,
		amount: 22_000,
		source: mockSolAddress,
		onBack: vi.fn(),
		onNext: vi.fn(),
		onTokensList: vi.fn(),
		cancel: mockSnippet
	};

	const amountSelector = `input[data-tid="${TOKEN_INPUT_CURRENCY_TOKEN}"]`;
	const toolbarSelector = 'div[data-tid="toolbar"]';

	beforeEach(() => {
		vi.clearAllMocks();
		vi.resetAllMocks();

		vi.spyOn(solanaApi, 'estimatePriorityFee').mockResolvedValue(ZERO);

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
				feeDecimalsStore: writable(SOLANA_TOKEN.decimals),
				feeTokenIdStore: writable(SOLANA_TOKEN.id),
				feeExchangeRateStore: writable(9.87)
			})
		);
	});

	it('should render all fields', () => {
		mockContext.set(
			SEND_CONTEXT_KEY,
			initSendContext({
				token: SOLANA_TOKEN
			})
		);

		const { container, getByTestId, getByText } = render(SolSendForm, {
			props,
			context: mockContext
		});

		const amount: HTMLInputElement | null = container.querySelector(amountSelector);

		expect(amount).not.toBeNull();

		expect(getByTestId(SEND_DESTINATION_SECTION)).toBeInTheDocument();

		expect(getByText(en.fee.text.fee)).toBeInTheDocument();

		const toolbar: HTMLDivElement | null = container.querySelector(toolbarSelector);

		expect(toolbar).not.toBeNull();
	});

	it('names the network the token is sent on', () => {
		mockContext.set(
			SEND_CONTEXT_KEY,
			initSendContext({
				token: SOLANA_TOKEN
			})
		);

		const { getByText } = render(SolSendForm, {
			props,
			context: mockContext
		});

		expect(
			getByText(
				replacePlaceholders(en.tokens.text.on_network_label, {
					$network: SOLANA_TOKEN.network.name
				})
			)
		).toBeInTheDocument();
	});

	describe('"Max"', () => {
		beforeEach(() => {
			mockContext.set(
				SEND_CONTEXT_KEY,
				initSendContext({
					token: SOLANA_TOKEN,
					customSendBalance: 1_000_000_000n
				})
			);

			// The base fee and a price of 1,500 micro-lamports over a SOL transfer's 1,000 units.
			mockFeeStore.setFee(5_002n);
		});

		const renderBound = () => {
			const amount = writable<OptionAmount>(undefined);
			const amountSetToMax = writable(false);

			const result = render(SolSendFormTest, {
				props: { ...props, amount, amountSetToMax },
				context: mockContext
			});

			return { ...result, amount, amountSetToMax };
		};

		// The wizard holds the fee while the amount is set by "Max", so the amount and the fee the
		// transaction is signed with add up to the balance.
		it('should hold back the quoted fee and flag the amount as set by "Max"', async () => {
			const { getByTestId, amount, amountSetToMax } = renderBound();

			await fireEvent.click(getByTestId(MAX_BUTTON));

			expect(get(amount)).toBe('0.999994998');
			expect(get(amountSetToMax)).toBeTruthy();
		});

		// Otherwise the next fee change puts the "Max" amount back over the one typed.
		it('should clear the flag once an amount is typed', async () => {
			const { container, getByTestId, amountSetToMax } = renderBound();

			await fireEvent.click(getByTestId(MAX_BUTTON));

			expect(get(amountSetToMax)).toBeTruthy();

			const input: HTMLInputElement | null = container.querySelector(amountSelector);

			assertNonNullish(input);

			await fireEvent.input(input, { target: { value: '0.5' } });

			expect(get(amountSetToMax)).toBeFalsy();
		});
	});

	describe('with SPL token', () => {
		beforeEach(() => {
			vi.clearAllMocks();
			vi.resetAllMocks();

			mockContext.set(
				SEND_CONTEXT_KEY,
				initSendContext({
					token: TRUMP_TOKEN
				})
			);

			vi.spyOn(solAddressUtils, 'isAtaAddress').mockResolvedValue(true);
		});

		it('should not render ATA creation fee if the destination is empty', () => {
			const { getByText } = render(SolSendForm, {
				props: { ...props, destination: '' },
				context: mockContext
			});

			expect(() => getByText(en.fee.text.ata_fee)).toThrow();
		});

		it('should render ATA creation fee if it is not nullish', async () => {
			const { getByText } = render(SolSendForm, {
				props,
				context: mockContext
			});

			mockAtaFeeStore.setFee(123n);

			// Wait for the fee to be loaded
			await new Promise((resolve) => setTimeout(resolve, 100));

			expect(getByText(en.fee.text.ata_fee)).toBeInTheDocument();
		});

		it('should not render ATA creation fee if it is nullish', async () => {
			mockAtaFeeStore.setFee(123n);

			const { getByText } = render(SolSendForm, {
				props,
				context: mockContext
			});

			mockAtaFeeStore.setFee(undefined);

			// Wait for the fee to be loaded
			await new Promise((resolve) => setTimeout(resolve, 5000));

			expect(() => getByText(en.fee.text.ata_fee)).toThrow();
		}, 60000);
	});
});
