import { XRP_TOKEN, XRP_TOKEN_ID } from '$env/tokens/tokens.xrp.env';
import { XRP_TRANSACTION_SKELETON_PREFIX } from '$lib/constants/test-ids.constants';
import { pageToken } from '$lib/derived/page-token.derived';
import { token } from '$lib/stores/token.store';
import type { OptionToken } from '$lib/types/token';
import { mockSnippet, mockSnippetTestId } from '$tests/mocks/snippet.mock';
import XrpTransactionsSkeletons from '$xrp/components/transactions/XrpTransactionsSkeletons.svelte';
import { xrpTransactionsStore } from '$xrp/stores/xrp-transactions.store';
import { render } from '@testing-library/svelte';
import type { Writable } from 'svelte/store';

// `pageToken` resolves the route against the ENABLED token list, and XRP is still force-disabled
// at this point in the stack — so no route could make it resolve to XRP, and driving it for real
// would test the enablement PR rather than this component. The component reads one thing from it,
// whether it is nullish, which is what this replaces.
vi.mock('$lib/derived/page-token.derived', async (importOriginal) => {
	const { writable } = await import('svelte/store');

	return {
		...(await importOriginal<Record<string, unknown>>()),
		pageToken: writable<OptionToken>(undefined)
	};
});

describe('XrpTransactionsSkeletons', () => {
	const mockPageToken = pageToken as Writable<OptionToken>;

	const renderComponent = () =>
		render(XrpTransactionsSkeletons, { props: { children: mockSnippet } });

	beforeEach(() => {
		vi.clearAllMocks();

		mockPageToken.set(undefined);
		// `tokenWithFallback` is what `xrpTransactionsInitialized` keys the store by — a different
		// source from the `pageToken` the component checks for nullishness.
		token.set(XRP_TOKEN);
		xrpTransactionsStore.reinitialize();
	});

	it('should show skeletons when no page token is resolved', () => {
		// Initialized, so the page token is the only thing that can hold the skeletons up.
		xrpTransactionsStore.append({ tokenId: XRP_TOKEN_ID, transactions: [] });

		const { getAllByTestId } = renderComponent();

		Array.from({ length: 5 }).forEach((_, i) => {
			expect(getAllByTestId(`${XRP_TRANSACTION_SKELETON_PREFIX}-${i}`)).toBeTruthy();
		});
	});

	it('should show skeletons when the token has no store entry', () => {
		mockPageToken.set(XRP_TOKEN);

		const { getAllByTestId } = renderComponent();

		Array.from({ length: 5 }).forEach((_, i) => {
			expect(getAllByTestId(`${XRP_TRANSACTION_SKELETON_PREFIX}-${i}`)).toBeTruthy();
		});
	});

	it('should show skeletons when the token entry is null', () => {
		mockPageToken.set(XRP_TOKEN);
		xrpTransactionsStore.reset(XRP_TOKEN_ID);

		const { getAllByTestId } = renderComponent();

		Array.from({ length: 5 }).forEach((_, i) => {
			expect(getAllByTestId(`${XRP_TRANSACTION_SKELETON_PREFIX}-${i}`)).toBeTruthy();
		});
	});

	it('should render the children when the token entry is initialized and empty', () => {
		mockPageToken.set(XRP_TOKEN);
		xrpTransactionsStore.append({ tokenId: XRP_TOKEN_ID, transactions: [] });

		const { getByTestId, queryByTestId } = renderComponent();

		expect(getByTestId(mockSnippetTestId)).toBeInTheDocument();
		expect(queryByTestId(`${XRP_TRANSACTION_SKELETON_PREFIX}-0`)).toBeNull();
	});

	// What `clear` has to achieve here: dropping the entry for an ownership change puts the view
	// back to loading rather than leaving the previous account's emptiness on screen.
	//
	// This component cannot tell `clear` from `nullify` — `xrpTransactionsInitialized` uses
	// `nonNullish`, so `null` and missing both read as loading, which is why the case above passes
	// too. The distinction is `isTransactionsStoreInitialized`, which counts anything not
	// `undefined` as initialized and drives the all-transactions view.
	it('should show skeletons again once the token entry is cleared for a handover', () => {
		mockPageToken.set(XRP_TOKEN);
		xrpTransactionsStore.append({ tokenId: XRP_TOKEN_ID, transactions: [] });
		xrpTransactionsStore.clear(XRP_TOKEN_ID);

		const { getAllByTestId, queryByTestId } = renderComponent();

		Array.from({ length: 5 }).forEach((_, i) => {
			expect(getAllByTestId(`${XRP_TRANSACTION_SKELETON_PREFIX}-${i}`)).toBeTruthy();
		});

		expect(queryByTestId(mockSnippetTestId)).toBeNull();
	});
});
