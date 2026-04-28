import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import SwapTokensList from '$lib/components/swap/SwapTokensList.svelte';
import { ONESEC_EVM_NETWORK_IDS } from '$lib/constants/swap.constants';
import { MODAL_TOKENS_LIST } from '$lib/constants/test-ids.constants';
import {
	initModalTokensListContext,
	MODAL_TOKENS_LIST_CONTEXT_KEY
} from '$lib/stores/modal-tokens-list.store';
import { SWAP_CONTEXT_KEY } from '$lib/stores/swap.store';
import type { Token } from '$lib/types/token';
import * as oneSecSwapUtils from '$lib/utils/onesec-swap.utils';
import { mockValidErc20Token } from '$tests/mocks/erc20-tokens.mock';
import { mockValidIcCkToken, mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import { render } from '@testing-library/svelte';
import { readable } from 'svelte/store';

vi.mock('$lib/utils/onesec-swap.utils', async (importOriginal) => {
	const actual = await importOriginal();
	return {
		...(actual as Record<string, unknown>),
		oneSecCompatibleDestinations: vi.fn()
	};
});

describe('SwapTokensList', () => {
	const props = {
		onSelectToken: () => {},
		onSelectNetworkFilter: () => {},
		onCloseTokensList: () => {}
	};

	const mockContext = (sourceToken?: Token) => {
		const result = new Map();

		result.set(SWAP_CONTEXT_KEY, {
			sourceToken: readable(sourceToken),
			destinationToken: readable(mockValidIcCkToken),
			destinationTokenExchangeRate: readable(0.00002)
		});

		result.set(MODAL_TOKENS_LIST_CONTEXT_KEY, initModalTokensListContext({ tokens: [ICP_TOKEN] }));

		return result;
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('renders tokens list', () => {
		const { getByTestId } = render(SwapTokensList, {
			props,
			context: mockContext()
		});

		expect(getByTestId(MODAL_TOKENS_LIST)).toBeInTheDocument();
	});

	it('does not call oneSecCompatibleDestinations when sourceToken is nullish', () => {
		render(SwapTokensList, { props, context: mockContext() });

		expect(oneSecSwapUtils.oneSecCompatibleDestinations).not.toHaveBeenCalled();
	});

	it('calls oneSecCompatibleDestinations with ICP sourceToken and ONESEC_EVM_NETWORK_IDS', () => {
		render(SwapTokensList, { props, context: mockContext(mockValidIcToken) });

		expect(oneSecSwapUtils.oneSecCompatibleDestinations).toHaveBeenCalledWith({
			sourceToken: mockValidIcToken,
			networkIds: ONESEC_EVM_NETWORK_IDS
		});
	});

	it('calls oneSecCompatibleDestinations with EVM sourceToken and ONESEC_EVM_NETWORK_IDS', () => {
		render(SwapTokensList, { props, context: mockContext(mockValidErc20Token) });

		expect(oneSecSwapUtils.oneSecCompatibleDestinations).toHaveBeenCalledWith({
			sourceToken: mockValidErc20Token,
			networkIds: ONESEC_EVM_NETWORK_IDS
		});
	});
});
