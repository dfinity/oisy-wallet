import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import GetTokenCardContent from '$lib/components/get-token/GetTokenCardContent.svelte';
import { GET_TOKEN_MODAL_POTENTIAL_USD_BALANCE } from '$lib/constants/test-ids.constants';
import { exchangeStore } from '$lib/stores/exchange.store';
import { mockSnippet } from '$tests/mocks/snippet.mock';
import { render } from '@testing-library/svelte';

describe('GetTokenCardContent', () => {
	const props = {
		token: ETHEREUM_TOKEN,
		currentApy: 10,
		potentialTokensUsdBalance: 1000,
		title: mockSnippet,
		label: mockSnippet
	};

	beforeEach(() => {
		exchangeStore.reset();
	});

	it('should display potential token USD balance if it is not zero', () => {
		const { getByTestId } = render(GetTokenCardContent, {
			props
		});

		expect(getByTestId(GET_TOKEN_MODAL_POTENTIAL_USD_BALANCE)).toBeInTheDocument();
	});

	it('should display potential token USD balance if it is zero', () => {
		const { getByTestId } = render(GetTokenCardContent, {
			props: {
				...props,
				potentialTokensUsdBalance: 0
			}
		});

		expect(getByTestId(GET_TOKEN_MODAL_POTENTIAL_USD_BALANCE)).toBeInTheDocument();
	});

	it('should not display balance value if exchange is not available', () => {
		const { getByText } = render(GetTokenCardContent, {
			props
		});

		expect(() => getByText(ETHEREUM_TOKEN.symbol)).toThrow();
	});

	it('should not display balance value if it is zero', () => {
		const { getByText } = render(GetTokenCardContent, {
			props: {
				...props,
				potentialTokensUsdBalance: 0
			}
		});

		expect(() => getByText(ETHEREUM_TOKEN.symbol)).toThrow();
	});

	it('displays balance value correctly if exchange is available', () => {
		exchangeStore.set([{ ethereum: { usd: 5 } }]);

		const { container } = render(GetTokenCardContent, {
			props
		});

		expect(container).toHaveTextContent(
			`~${props.potentialTokensUsdBalance / 5} ${ETHEREUM_TOKEN.symbol}`
		);
	});
});
