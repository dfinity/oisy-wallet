import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import SendSource from '$lib/components/send/SendSource.svelte';
import { render } from '@testing-library/svelte';
import { BigNumber } from 'alchemy-sdk';

describe('SendSource', () => {
	const props = {
		token: BTC_MAINNET_TOKEN,
		balance: BigNumber.from(22000000),
		source: '0xF2777205439a8c7be0425cbb21D8DB7426Df5DE9'
	};

	const sourceSelector = 'div[id="source"]';
	const balanceSelector = 'div[id="balance"]';

	it('should render all fields with values', () => {
		const { container } = render(SendSource, { props });

		const source: HTMLDivElement | null = container.querySelector(sourceSelector);
		const balance: HTMLDivElement | null = container.querySelector(balanceSelector);

		expect(source?.textContent).toBe('0xF2777205439a8c7be0425cbb21D8DB7426Df5DE9');
		expect(balance?.textContent).toBe('0.22 BTC');
	});
	it('should render all field but balance without value', () => {
		const { container } = render(SendSource, { ...props, token: undefined });

		const source: HTMLDivElement | null = container.querySelector(sourceSelector);
		const balance: HTMLDivElement | null = container.querySelector(balanceSelector);

		expect(source?.textContent).toBe('0xF2777205439a8c7be0425cbb21D8DB7426Df5DE9');
		expect(balance?.textContent).toBe('\u200B');
	});
	it('should render only balance', () => {
		const { container } = render(SendSource, { ...props, hideSource: true });

		const source: HTMLDivElement | null = container.querySelector(sourceSelector);
		const balance: HTMLDivElement | null = container.querySelector(balanceSelector);

		expect(source).toBeNull();
		expect(balance?.textContent).toBe('0.22 BTC');
	});
});
