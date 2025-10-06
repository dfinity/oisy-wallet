import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import SendSource from '$lib/components/send/SendSource.svelte';
import { mockEthAddress } from '$tests/mocks/eth.mock';
import { render } from '@testing-library/svelte';

describe('SendSource', () => {
	const props = {
		token: BTC_MAINNET_TOKEN,
		balance: 22000000n,
		source: mockEthAddress
	};

	const sourceSelector = 'div[id="source"]';
	const balanceSelector = 'div[id="balance"]';

	it('should render all fields with values', () => {
		const { container } = render(SendSource, { props });

		const source: HTMLDivElement | null = container.querySelector(sourceSelector);
		const balance: HTMLDivElement | null = container.querySelector(balanceSelector);

		expect(source).toHaveTextContent(mockEthAddress);
		expect(balance?.textContent).toContain('0.22');
		expect(balance?.textContent).toContain('BTC');
	});

	it('should render all field but balance without value', () => {
		const { container } = render(SendSource, { ...props, token: undefined });

		const source: HTMLDivElement | null = container.querySelector(sourceSelector);
		const balance: HTMLDivElement | null = container.querySelector(balanceSelector);

		expect(source).toHaveTextContent(mockEthAddress);
		expect(balance?.textContent).toBe('\u200B');
	});
});
