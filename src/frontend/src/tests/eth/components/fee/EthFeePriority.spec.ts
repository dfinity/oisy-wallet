import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import EthFeePriority from '$eth/components/fee/EthFeePriority.svelte';
import { ETH_FEE_CONTEXT_KEY, initEthFeeContext, initEthFeeStore } from '$eth/stores/eth-fee.store';
import type { EthFeePriorities } from '$eth/types/fee';
import {
	CONVERT_AMOUNT_EXCHANGE_VALUE,
	ETH_FEE_PRIORITY,
	ETH_FEE_PRIORITY_OPTION,
	ETH_FEE_PRIORITY_TRIGGER
} from '$lib/constants/test-ids.constants';
import { EthFeePriority as Priority } from '$lib/enums/eth-fee-priority';
import { screensStore } from '$lib/stores/screens.store';
import { SEND_CONTEXT_KEY, initSendContext } from '$lib/stores/send.store';
import en from '$tests/mocks/i18n.mock';
import { render, waitFor, within } from '@testing-library/svelte';
import { get, writable } from 'svelte/store';

describe('EthFeePriority', () => {
	const gas = 21_000n;

	// The ceiling is identical across priorities on purpose: it is dominated by the shared base fee,
	// so only the tip may move the displayed amounts apart.
	const priorities: EthFeePriorities = {
		baseFeePerGas: 20_000_000_000n,
		perPriority: {
			[Priority.SLOW]: { maxFeePerGas: 100_000_000_000n, maxPriorityFeePerGas: 1_000_000_000n },
			[Priority.MEDIUM]: { maxFeePerGas: 100_000_000_000n, maxPriorityFeePerGas: 5_000_000_000n },
			[Priority.FAST]: { maxFeePerGas: 100_000_000_000n, maxPriorityFeePerGas: 20_000_000_000n }
		}
	};

	// The rows quote fiat only, so an exchange rate is required for them to render at all.
	const exchangeRate = 3_000;

	const setup = ({
		withPriorities = true,
		withSymbol = true
	}: { withPriorities?: boolean; withSymbol?: boolean } = {}) => {
		const feeStore = initEthFeeStore();
		feeStore.setFee({
			...priorities.perPriority[Priority.MEDIUM],
			baseFeePerGas: priorities.baseFeePerGas,
			gas
		});

		// A real send context rather than a cast partial: the component only reads
		// `sendEthFeePriority`, but casting would hide it if that ever changed.
		const sendContext = initSendContext({ token: ETHEREUM_TOKEN });
		const { sendEthFeePriority } = sendContext;

		const feeContext = initEthFeeContext({
			feeStore,
			feeSymbolStore: writable(withSymbol ? ETHEREUM_TOKEN.symbol : undefined),
			feeTokenIdStore: writable(ETHEREUM_TOKEN.id),
			feeDecimalsStore: writable(ETHEREUM_TOKEN.decimals),
			feeExchangeRateStore: writable(exchangeRate)
		});

		if (withPriorities) {
			feeContext.feePrioritiesStore.set(priorities);
		}

		const context = new Map<symbol, unknown>();
		context.set(ETH_FEE_CONTEXT_KEY, feeContext);
		context.set(SEND_CONTEXT_KEY, sendContext);

		return { context, sendEthFeePriority };
	};

	beforeEach(() => {
		// Large screens expand the options in place, so they are in the DOM without opening a sheet.
		screensStore.set('lg');
	});

	it('renders one option per priority, defaulting to normal', async () => {
		const { context } = setup();

		const { getByTestId } = render(EthFeePriority, { context });

		await waitFor(() => {
			expect(getByTestId(`${ETH_FEE_PRIORITY_OPTION}-${Priority.SLOW}`)).toBeInTheDocument();
			expect(getByTestId(`${ETH_FEE_PRIORITY_OPTION}-${Priority.FAST}`)).toBeInTheDocument();
			expect(getByTestId(`${ETH_FEE_PRIORITY_OPTION}-${Priority.MEDIUM}`)).toBeChecked();
		});
	});

	it('prices each option on the same gas limit, so only the tip separates them', async () => {
		const { context } = setup();

		const { findAllByTestId } = render(EthFeePriority, { context });

		const values = await findAllByTestId(CONVERT_AMOUNT_EXCHANGE_VALUE);

		expect(values).toHaveLength(Object.values(Priority).length);

		// Asserting distinctness rather than exact strings: the point is that the shared base fee and
		// gas limit cancel out and only the tip moves the amounts, and the formatted currency string
		// depends on locale and currency stores that are not what this test is about.
		expect(new Set(values.map(({ textContent }) => textContent)).size).toBe(values.length);
	});

	it('records the choice in the send context', async () => {
		const { context, sendEthFeePriority } = setup();

		const { getByTestId } = render(EthFeePriority, { context });

		await waitFor(() => {
			expect(getByTestId(`${ETH_FEE_PRIORITY_OPTION}-${Priority.FAST}`)).toBeInTheDocument();
		});

		getByTestId(`${ETH_FEE_PRIORITY_OPTION}-${Priority.FAST}`).click();

		await waitFor(() => {
			expect(get(sendEthFeePriority)).toBe(Priority.FAST);
		});
	});

	it('offers the options in a sheet on small screens', async () => {
		screensStore.set('xs');

		const { context } = setup();

		const { getByTestId, queryByTestId } = render(EthFeePriority, { context });

		await waitFor(() => {
			expect(getByTestId(ETH_FEE_PRIORITY_TRIGGER)).toBeInTheDocument();
			expect(queryByTestId(`${ETH_FEE_PRIORITY_OPTION}-${Priority.SLOW}`)).not.toBeInTheDocument();
		});

		getByTestId(ETH_FEE_PRIORITY_TRIGGER).click();

		await waitFor(() => {
			expect(getByTestId(`${ETH_FEE_PRIORITY_OPTION}-${Priority.SLOW}`)).toBeInTheDocument();
		});
	});

	it('neither opens nor closes the sheet by submitting the surrounding send form', async () => {
		screensStore.set('xs');

		const { context } = setup();

		const { getByTestId, getByText } = render(EthFeePriority, { context });

		await waitFor(() => {
			expect(getByTestId(ETH_FEE_PRIORITY_TRIGGER)).toHaveAttribute('type', 'button');
		});

		getByTestId(ETH_FEE_PRIORITY_TRIGGER).click();

		await waitFor(() => {
			expect(getByText(en.core.text.done).closest('button')).toHaveAttribute('type', 'button');
		});
	});

	it('names the current choice in the collapsed header on a large screen', async () => {
		const { context } = setup();

		const { getByTestId } = render(EthFeePriority, { context });

		await waitFor(() => {
			// Scoped to the header: the options stay mounted while collapsed, so a document-wide
			// query would keep passing if the header stopped naming the choice.
			expect(
				within(getByTestId('collapsible-header')).getByText(en.fee.text.priority_medium)
			).toBeInTheDocument();
		});
	});

	it('names the current choice once on a small screen', async () => {
		screensStore.set('xs');

		const { context } = setup();

		const { getAllByText } = render(EthFeePriority, { context });

		await waitFor(() => {
			expect(getAllByText(en.fee.text.priority_medium)).toHaveLength(1);
		});
	});

	it('renders without a fee symbol, which it no longer displays', async () => {
		const { context } = setup({ withSymbol: false });

		const { getByTestId } = render(EthFeePriority, { context });

		await waitFor(() => {
			expect(getByTestId(ETH_FEE_PRIORITY)).toBeInTheDocument();
		});
	});

	it('renders nothing when the network offers no choice', () => {
		const { context } = setup({ withPriorities: false });

		const { queryByTestId } = render(EthFeePriority, { context });

		expect(queryByTestId(ETH_FEE_PRIORITY)).not.toBeInTheDocument();
	});
});
