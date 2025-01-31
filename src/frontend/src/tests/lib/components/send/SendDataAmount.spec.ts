import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import { SOLANA_TOKEN } from '$env/tokens/tokens.sol.env';
import SendDataAmount from '$lib/components/send/SendDataAmount.svelte';
import { assertNonNullish } from '@dfinity/utils';
import { render } from '@testing-library/svelte';

describe('SendDataAmount', () => {
	const mockTokens = [BTC_MAINNET_TOKEN, ETHEREUM_TOKEN, ICP_TOKEN, SOLANA_TOKEN];

	describe.each(mockTokens)('with token $name', (mockToken) => {
		it('should render the amount element', () => {
			const { container } = render(SendDataAmount, { props: { token: mockToken } });

			const renderedElement = container.querySelector(`#amount`);
			assertNonNullish(renderedElement, 'Element not found');

			expect(renderedElement.tagName.toLowerCase()).toBe('div');
		});

		it('should render zero amount if no value is given', () => {
			const { container } = render(SendDataAmount, { props: { token: mockToken } });

			const renderedElement = container.querySelector(`#amount`);
			assertNonNullish(renderedElement, 'Element not found');

			expect(renderedElement.textContent).toBe(`0 ${mockToken.symbol}`);
		});

		it('should render the correct amount when provided as number', () => {
			const { container } = render(SendDataAmount, {
				props: { amount: 1234.56789, token: mockToken }
			});

			const renderedElement = container.querySelector(`#amount`);
			assertNonNullish(renderedElement, 'Element not found');

			expect(renderedElement.textContent).toBe(`1234.56789 ${mockToken.symbol}`);
		});

		it('should render the correct amount when provided as string', () => {
			const { container } = render(SendDataAmount, {
				props: { amount: '1234.56789', token: mockToken }
			});

			const renderedElement = container.querySelector(`#amount`);
			assertNonNullish(renderedElement, 'Element not found');

			expect(renderedElement.textContent).toBe(`1234.56789 ${mockToken.symbol}`);
		});
	});
});
