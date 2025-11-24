import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import SwapTokensList from '$lib/components/swap/SwapTokensList.svelte';
import { MODAL_TOKENS_LIST } from '$lib/constants/test-ids.constants';
import {
	initModalTokensListContext,
	MODAL_TOKENS_LIST_CONTEXT_KEY
} from '$lib/stores/modal-tokens-list.store';
import { SWAP_CONTEXT_KEY } from '$lib/stores/swap.store';
import { mockValidIcCkToken } from '$tests/mocks/ic-tokens.mock';
import { render } from '@testing-library/svelte';
import { readable } from 'svelte/store';

describe('SwapTokensList', () => {
	const props = {
		onSelectToken: () => {},
		onSelectNetworkFilter: () => {},
		onCloseTokensList: () => {}
	};

	const mockContext = () => {
		const result = new Map();

		result.set(SWAP_CONTEXT_KEY, {
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
});
