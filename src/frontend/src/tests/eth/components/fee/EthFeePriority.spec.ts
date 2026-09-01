import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import EthFeePriority from '$eth/components/fee/EthFeePriority.svelte';
import { ETH_FEE_CONTEXT_KEY, initEthFeeContext, initEthFeeStore } from '$eth/stores/eth-fee.store';
import type { EthFeePriorities } from '$eth/types/fee';
import { estimatedGasFee } from '$eth/utils/fee.utils';
import { ZERO } from '$lib/constants/app.constants';
import {
	ETH_FEE_PRIORITY,
	ETH_FEE_PRIORITY_OPTION,
	ETH_FEE_PRIORITY_TRIGGER
} from '$lib/constants/test-ids.constants';
import { EthFeePriority as Priority } from '$lib/enums/eth-fee-priority';
import { screensStore } from '$lib/stores/screens.store';
import { SEND_CONTEXT_KEY, initSendContext } from '$lib/stores/send.store';
import { formatToken } from '$lib/utils/format.utils';
import en from '$tests/mocks/i18n.mock';
import { render, waitFor } from '@testing-library/svelte';
import { get, writable } from 'svelte/store';

describe('EthFeePriority', () => {
	const gas = 21_000n;

	// The ceiling is identical across priorities on purpose: it is dominated by the shared base fee,
	// so only the tip may move the displayed amounts apart.
	const priorities: EthFeePriorities = {
		baseFeePerGas: 20n,
		perPriority: {
			[Priority.SLOW]: { maxFeePerGas: 100n, maxPriorityFeePerGas: 1n },
			[Priority.NORMAL]: { maxFeePerGas: 100n, maxPriorityFeePerGas: 5n },
			[Priority.FAST]: { maxFeePerGas: 100n, maxPriorityFeePerGas: 20n }
		}
	};

	const setup = ({ withPriorities = true }: { withPriorities?: boolean } = {}) => {
		const feeStore = initEthFeeStore();
		feeStore.setFee({
			...priorities.perPriority[Priority.NORMAL],
			baseFeePerGas: priorities.baseFeePerGas,
			gas
		});

		// A real send context rather than a cast partial: the component only reads
		// `sendEthFeePriority`, but casting would hide it if that ever changed.
		const sendContext = initSendContext({ token: ETHEREUM_TOKEN });
		const { sendEthFeePriority } = sendContext;

		const feeContext = initEthFeeContext({
			feeStore,
			feeSymbolStore: writable(ETHEREUM_TOKEN.symbol),
			feeTokenIdStore: writable(ETHEREUM_TOKEN.id),
			feeDecimalsStore: writable(ETHEREUM_TOKEN.decimals),
			feeExchangeRateStore: writable(undefined)
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
			expect(getByTestId(`${ETH_FEE_PRIORITY_OPTION}-${Priority.NORMAL}`)).toBeChecked();
		});
	});

	it('prices each option on the same gas limit, so only the tip separates them', async () => {
		const { context } = setup();

		const { container } = render(EthFeePriority, { context });

		await waitFor(() => {
			Object.values(Priority).forEach((priority) => {
				const expected = estimatedGasFee({
					...priorities.perPriority[priority],
					baseFeePerGas: priorities.baseFeePerGas,
					gas
				});

				expect(container).toHaveTextContent(
					formatToken({
						value: expected ?? ZERO,
						displayDecimals: ETHEREUM_TOKEN.decimals,
						unitName: ETHEREUM_TOKEN.decimals
					})
				);
			});
		});
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

	it('opens the sheet without submitting the surrounding send form', async () => {
		// The send form wraps this component and Button defaults to type="submit", so a submitting
		// trigger fires HTML5 validation on the empty amount field instead of opening the sheet.
		screensStore.set('xs');

		const { context } = setup();

		const { getByTestId } = render(EthFeePriority, { context });

		await waitFor(() => {
			expect(getByTestId(ETH_FEE_PRIORITY_TRIGGER)).toHaveAttribute('type', 'button');
		});
	});

	it('names the current choice in the collapsed header on a large screen', async () => {
		const { context } = setup();

		const { getByText } = render(EthFeePriority, { context });

		await waitFor(() => {
			// Large screens have no trigger, so the header is the only place the choice can show.
			expect(getByText(en.fee.text.priority_normal)).toBeInTheDocument();
		});
	});

	it('names the current choice once on a small screen', async () => {
		screensStore.set('xs');

		const { context } = setup();

		const { getAllByText } = render(EthFeePriority, { context });

		await waitFor(() => {
			// The trigger carries it there, so repeating it in the header would say it twice.
			expect(getAllByText(en.fee.text.priority_normal)).toHaveLength(1);
		});
	});

	it('renders nothing when the network offers no choice', () => {
		const { context } = setup({ withPriorities: false });

		const { queryByTestId } = render(EthFeePriority, { context });

		expect(queryByTestId(ETH_FEE_PRIORITY)).not.toBeInTheDocument();
	});
});
