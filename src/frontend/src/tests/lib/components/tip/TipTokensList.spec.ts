import TipTokensList from '$lib/components/tip/TipTokensList.svelte';
import { i18n } from '$lib/stores/i18n.store';
import {
	initModalTokensListContext,
	MODAL_TOKENS_LIST_CONTEXT_KEY
} from '$lib/stores/modal-tokens-list.store';
import { render } from '@testing-library/svelte';
import { get } from 'svelte/store';

describe('TipTokensList', () => {
	// The empty list has three different causes and they are not interchangeable:
	// nothing tippable at all, a search that matched nothing, and tippable assets
	// that are all at zero. `ModalTokensList` renders `noResults` once its own
	// search and category filters match nothing, while this component's `tokens`
	// is the *unfiltered* tippable set — so branching on `tokens.length` alone
	// told a user who simply mistyped a ticker that their assets were hidden for
	// having no balance, and sent them looking for a balance problem they did not
	// have.
	it('says no results for a search that matched nothing, not that balances are hidden', () => {
		const context = initModalTokensListContext({ tokens: [] });
		context.setFilterQuery('zzzz-no-such-token');

		const { getByText, queryByText } = render(TipTokensList, {
			props: { onSelectToken: vi.fn(), onClose: vi.fn() },
			context: new Map([[MODAL_TOKENS_LIST_CONTEXT_KEY, context]])
		});

		expect(getByText(get(i18n).core.text.no_results)).toBeInTheDocument();

		// The copy this branch used to show. Asserted as absent rather than only
		// asserting the right one, because the failure was showing a true-sounding
		// sentence about the wrong thing.
		expect(queryByText(get(i18n).tokens.text.all_tokens_with_zero_hidden)).not.toBeInTheDocument();
		expect(queryByText(get(i18n).tip.text.empty_balance_description)).not.toBeInTheDocument();
	});
});
