import AiAssistantShowBalanceTool from '$lib/components/ai-assistant/AiAssistantShowBalanceTool.svelte';

import { USDC_TOKEN as USDC_TOKEN_ERC20 } from '$env/tokens/tokens-erc20/tokens.usdc.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import { formatToken } from '$lib/utils/format.utils';
import { render } from '@testing-library/svelte';

describe('AiAssistantShowBalanceTool', () => {
	const props = {
		loading: false,
		onSendMessage: () => Promise.resolve()
	};
	const balance1 = 1000n;
	const balance2 = 2000n;

	it('renders correctly when only main card provided', () => {
		const { container } = render(AiAssistantShowBalanceTool, {
			props: {
				...props,
				mainCard: {
					token: { ...ICP_TOKEN, usdBalance: 1000, balance: balance1 },
					totalUsdBalance: 1000
				}
			}
		});

		expect(container).toHaveTextContent('$1,000.00');
		expect(container).toHaveTextContent(ICP_TOKEN.name);
		expect(container).toHaveTextContent(ICP_TOKEN.network.name);
		expect(container).toHaveTextContent(
			formatToken({
				value: balance1,
				displayDecimals: ICP_TOKEN.decimals,
				unitName: ICP_TOKEN.decimals
			})
		);
	});

	it('renders correctly when main and secondary cards provided', () => {
		const { container } = render(AiAssistantShowBalanceTool, {
			props: {
				...props,
				mainCard: {
					token: { ...ICP_TOKEN, usdBalance: 1000, balance: balance1 },
					totalUsdBalance: 1000
				},
				secondaryCards: [{ ...USDC_TOKEN_ERC20, usdBalance: 500, balance: balance2 }]
			}
		});

		expect(container).toHaveTextContent('$1,000.00');
		expect(container).toHaveTextContent(ICP_TOKEN.name);
		expect(container).toHaveTextContent(ICP_TOKEN.network.name);
		expect(container).toHaveTextContent(
			formatToken({
				value: balance1,
				displayDecimals: ICP_TOKEN.decimals,
				unitName: ICP_TOKEN.decimals
			})
		);

		expect(container).toHaveTextContent('$500.00');
		expect(container).toHaveTextContent(USDC_TOKEN_ERC20.name);
		expect(container).toHaveTextContent(USDC_TOKEN_ERC20.network.name);
		expect(container).toHaveTextContent(
			formatToken({
				value: balance2,
				displayDecimals: USDC_TOKEN_ERC20.decimals,
				unitName: USDC_TOKEN_ERC20.decimals
			})
		);
	});
});
