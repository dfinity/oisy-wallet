import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import { SOLANA_TOKEN } from '$env/tokens/tokens.sol.env';
import SendDataAmount from '$lib/components/send/SendDataAmount.svelte';
import { EIGHT_DECIMALS, MAX_UINT_256 } from '$lib/constants/app.constants';
import { formatToken } from '$lib/utils/format.utils';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import en from '$tests/mocks/i18n.mock';
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

			expect(renderedElement.textContent).toContain(`0 ${mockToken.symbol}`);
		});

		it('should render the correct amount when provided as bigint', () => {
			const amount = 10n ** BigInt(mockToken.decimals);
			const { container } = render(SendDataAmount, {
				props: { amount, token: mockToken }
			});

			const renderedElement = container.querySelector(`#amount`);
			assertNonNullish(renderedElement, 'Element not found');

			expect(renderedElement.textContent).toContain(`1 ${mockToken.symbol}`);
		});

		it('should render usd value if amount and exchange rate is given', () => {
			const exchangeRate = 2;
			const amount = 10n ** BigInt(mockToken.decimals);
			const { container } = render(SendDataAmount, {
				props: { amount, token: mockToken, exchangeRate }
			});

			const renderedElement = container.querySelector(`#amount`);
			assertNonNullish(renderedElement, 'Element not found');

			expect(renderedElement.textContent).toContain(`1 ${mockToken.symbol}`);
			expect(renderedElement.textContent).toContain(`( $${exchangeRate}.00 )`);
		});

		it('should render special usd value if exchange rate is smaller than the threshold', () => {
			const exchangeRate = 0.001;
			const amount = 10n ** BigInt(mockToken.decimals);
			const { container } = render(SendDataAmount, {
				props: { amount, token: mockToken, exchangeRate }
			});

			const renderedElement = container.querySelector(`#amount`);
			assertNonNullish(renderedElement, 'Element not found');

			expect(renderedElement.textContent).toContain(`1 ${mockToken.symbol}`);
			expect(renderedElement.textContent).toContain(`( < $0.01 )`);
		});

		describe('when the amount is the max uint256', () => {
			it('should render unlimited amount if showUnlimitedLabel is true', () => {
				const amount = MAX_UINT_256;
				const { container } = render(SendDataAmount, {
					props: { amount, token: mockToken, showUnlimitedLabel: true }
				});

				const renderedElement = container.querySelector(`#amount`);
				assertNonNullish(renderedElement, 'Element not found');

				const expected = replacePlaceholders(en.core.text.unlimited, {
					$items: mockToken.symbol
				});

				expect(renderedElement.textContent).toContain(expected);
			});

			it('should render number amount if showUnlimitedLabel is false', () => {
				const amount = MAX_UINT_256;
				const { container } = render(SendDataAmount, {
					props: { amount, token: mockToken, showUnlimitedLabel: false }
				});

				const renderedElement = container.querySelector(`#amount`);
				assertNonNullish(renderedElement, 'Element not found');

				const expected = formatToken({
					value: amount,
					unitName: mockToken.decimals,
					displayDecimals: EIGHT_DECIMALS
				});

				expect(renderedElement.textContent).toContain(`${expected} ${mockToken.symbol}`);
			});
		});
	});
});
