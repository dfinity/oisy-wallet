import TokensPage from '$lib/components/tokens/Tokens.svelte';
import { TOKEN_LIST_FILTER } from '$lib/constants/test-ids.constants';
import { render } from '@testing-library/svelte';

describe('TokenListFilter', () => {
	it('handle opening the input', async () => {
		const { getByTestId } = render(TokensPage);
		const openBtn = getByTestId(`${TOKEN_LIST_FILTER}-open-btn`);
		const clearBtn = getByTestId(`${TOKEN_LIST_FILTER}-clear-btn`);
		const input = getByTestId(`${TOKEN_LIST_FILTER}-input`);

		openBtn.click();

		expect(input).toBeVisible();
	});
});
