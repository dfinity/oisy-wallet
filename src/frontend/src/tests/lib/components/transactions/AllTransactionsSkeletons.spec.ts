import { btcTransactionsStore } from '$btc/stores/btc-transactions.store';
import { ethTransactionsStore } from '$eth/stores/eth-transactions.store';
import { icTransactionsStore } from '$icp/stores/ic-transactions.store';

describe('Activity', () => {
	beforeEach(() => {
		vi.clearAllMocks();

		btcTransactionsStore.reset();

		ethTransactionsStore.reset();

		icTransactionsStore.reset();
	});

	// it('renders the title', () => {
	// 	const { container } = render(AllTransactionsSkeletons);
	//
	// 	const title: HTMLHeadingElement | null = container.querySelector('h1');
	//
	// 	expect(title).not.toBeNull();
	// 	assertNonNullish(title, 'Title not found');
	// 	expect(title).toBeInTheDocument();
	// 	expect(title.textContent).toBe(en.activity.text.title);
	// });
	//
	// it('renders the transactions list', () => {
	// 	const { getByText } = render(AllTransactionsSkeletons);
	//
	// 	expect(getByText(en.transactions.text.transaction_history)).toBeInTheDocument();
	// });
});
