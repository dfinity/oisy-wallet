import IcIndexCanisterStatus from '$icp/components/transactions/IcIndexCanisterStatus.svelte';
import { emit } from '$lib/utils/events.utils';
import en from '$tests/mocks/i18n.mock';
import { createMockSnippet } from '$tests/mocks/snippet.mock';
import { render } from '@testing-library/svelte';
import { tick } from 'svelte';

describe('IcIndexCanisterStatus', () => {
	const mockTestId = 'mock-test-id';
	const mockSnippet = createMockSnippet(mockTestId);

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should not render the loading status by default', async () => {
		const { queryByText, getByTestId } = render(IcIndexCanisterStatus, {
			props: {
				children: mockSnippet
			}
		});

		await tick();

		expect(getByTestId(mockTestId)).toBeInTheDocument();

		expect(queryByText(en.receive.icp.text.checking_index_canister_status)).not.toBeInTheDocument();
	});

	it('should render the loading status if it receives a positive event oisyIndexCanisterBalanceOutOfSync', async () => {
		const { queryByText, queryByTestId, getByTestId } = render(IcIndexCanisterStatus, {
			props: {
				children: mockSnippet
			}
		});

		await tick();

		expect(getByTestId(mockTestId)).toBeInTheDocument();

		expect(queryByText(en.receive.icp.text.checking_index_canister_status)).not.toBeInTheDocument();

		emit({ message: 'oisyIndexCanisterBalanceOutOfSync', detail: true });

		await tick();

		expect(queryByText(en.receive.icp.text.checking_index_canister_status)).toBeInTheDocument();

		expect(queryByTestId(mockTestId)).not.toBeInTheDocument();
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

		expect(queryByTestId(mockTestId)).not.toBeInTheDocument();

		emit({ message: 'oisyIndexCanisterBalanceOutOfSync', detail: false });

		await tick();

		expect(getByTestId(mockTestId)).toBeInTheDocument();

		expect(queryByText(en.receive.icp.text.checking_index_canister_status)).not.toBeInTheDocument();
	});
});
