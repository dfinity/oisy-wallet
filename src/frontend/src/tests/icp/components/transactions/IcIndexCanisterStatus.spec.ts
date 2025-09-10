import IcIndexCanisterStatus from '$icp/components/transactions/IcIndexCanisterStatus.svelte';
import { emit } from '$lib/utils/events.utils';
import en from '$tests/mocks/i18n.mock';
import { mockSnippet, mockSnippetTestId } from '$tests/mocks/snippet.mock';
import { cleanup, render, waitFor } from '@testing-library/svelte';
import { tick } from 'svelte';

describe('IcIndexCanisterStatus', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		cleanup();
	});

	it('should not render the loading status by default', async () => {
		const { queryByText, getByTestId } = render(IcIndexCanisterStatus, {
			props: {
				children: mockSnippet
			}
		});

		await waitFor(() => {
			expect(getByTestId(mockSnippetTestId)).toBeInTheDocument();

			expect(
				queryByText(en.receive.icp.text.checking_index_canister_status)
			).not.toBeInTheDocument();
		});
	});

	it('should render the loading status if it receives a positive event oisyIndexCanisterBalanceOutOfSync', async () => {
		const { queryByText, queryByTestId, getByTestId } = render(IcIndexCanisterStatus, {
			props: {
				children: mockSnippet
			}
		});

		await waitFor(() => {
			expect(getByTestId(mockSnippetTestId)).toBeInTheDocument();

			expect(
				queryByText(en.receive.icp.text.checking_index_canister_status)
			).not.toBeInTheDocument();
		});

		emit({ message: 'oisyIndexCanisterBalanceOutOfSync', detail: true });

		await tick();

		expect(queryByText(en.receive.icp.text.checking_index_canister_status)).toBeInTheDocument();

		expect(queryByTestId(mockSnippetTestId)).not.toBeInTheDocument();
	});

	it('should unmount the loading status if it receives a negative event oisyIndexCanisterBalanceOutOfSync', async () => {
		const { queryByText, queryByTestId, getByTestId } = render(IcIndexCanisterStatus, {
			props: {
				children: mockSnippet
			}
		});

		emit({ message: 'oisyIndexCanisterBalanceOutOfSync', detail: true });

		await tick();

		expect(queryByText(en.receive.icp.text.checking_index_canister_status)).toBeInTheDocument();

		expect(queryByTestId(mockSnippetTestId)).not.toBeInTheDocument();

		emit({ message: 'oisyIndexCanisterBalanceOutOfSync', detail: false });

		await waitFor(() => {
			expect(getByTestId(mockSnippetTestId)).toBeInTheDocument();

			expect(
				queryByText(en.receive.icp.text.checking_index_canister_status)
			).not.toBeInTheDocument();
		});
	});
});
