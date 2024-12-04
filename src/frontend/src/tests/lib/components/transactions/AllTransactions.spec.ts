import { icTransactionsStore } from '$icp/stores/ic-transactions.store';
import { icrcCustomTokensStore } from '$icp/stores/icrc-custom-tokens.store';
import type { IcrcCustomToken } from '$icp/types/icrc-custom-token';
import AllTransactions from '$lib/components/transactions/AllTransactions.svelte';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import en from '$tests/mocks/i18n.mock';
import { mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import { assertNonNullish } from '@dfinity/utils';
import { render } from '@testing-library/svelte';
import { get } from 'svelte/store';

describe('Activity', () => {
	const customIcrcToken: IcrcCustomToken = {
		...mockValidIcToken,
		version: 1n,
		enabled: true
	};

	it('renders the title', () => {
		const { container } = render(AllTransactions);

		const title: HTMLHeadingElement | null = container.querySelector('h1');

		expect(title).not.toBeNull();
		assertNonNullish(title, 'Title not found');
		expect(title).toBeInTheDocument();
		expect(title.textContent).toBe(en.activity.text.title);
	});

	it('renders the no Index canister warning box', () => {
		const tokenWithoutIndexCanister: IcrcCustomToken = {
			...customIcrcToken,
			symbol: 'UWT'
		};

		icrcCustomTokensStore.set({ data: tokenWithoutIndexCanister, certified: true });

		const store = get(icrcCustomTokensStore);
		const tokenId = store!.at(0)!.data.id;
		icTransactionsStore.nullify(tokenId);

		const { getByText } = render(AllTransactions);

		const exceptedText = replacePlaceholders(en.activity.warning.no_index_canister, {
			$token_list: '$UWT'
		});

		expect(getByText(exceptedText)).toBeInTheDocument();
	});

	it('renders the info box list', () => {
		const { getByText } = render(AllTransactions);

		expect(getByText(en.activity.info.btc_transactions)).toBeInTheDocument();
	});

	it('renders the transactions list', () => {
		const { getByText } = render(AllTransactions);

		expect(getByText(en.transactions.text.transaction_history)).toBeInTheDocument();
	});
});
