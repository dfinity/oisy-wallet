import AiAssistantShowBalanceToolCard from '$lib/components/ai-assistant/AiAssistantShowBalanceToolCard.svelte';

import { ICP_NETWORK } from '$env/networks/networks.icp.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import { formatToken } from '$lib/utils/format.utils';
import en from '$tests/mocks/i18n.mock';
import { render } from '@testing-library/svelte';

describe('AiAssistantShowBalanceToolCard', () => {
	const props = {
		totalUsdBalance: 1000,
		onClick: () => {}
	};
	const balance = 1000n;

	it('renders card with token if it is provided', () => {
		const { container } = render(AiAssistantShowBalanceToolCard, {
			props: {
				...props,
				token: { ...ICP_TOKEN, usdBalance: 1000, balance }
			}
		});

		expect(container).toHaveTextContent('$1,000.00');
		expect(container).toHaveTextContent(ICP_TOKEN.name);
		expect(container).toHaveTextContent(ICP_TOKEN.network.name);
		expect(container).toHaveTextContent(
			formatToken({
				value: balance,
				displayDecimals: ICP_TOKEN.decimals,
				unitName: ICP_TOKEN.decimals
			})
		);
	});

	it('renders card with network if it is provided', () => {
		const { container } = render(AiAssistantShowBalanceToolCard, {
			props: {
				...props,
				network: ICP_NETWORK
			}
		});

		expect(container).toHaveTextContent('$1,000.00');
		expect(container).toHaveTextContent(ICP_NETWORK.name);
	});

	it('renders card with total balance', () => {
		const { container } = render(AiAssistantShowBalanceToolCard, {
			props
		});

		expect(container).toHaveTextContent('$1,000.00');
		expect(container).toHaveTextContent(en.ai_assistant.text.show_total_balance_tool_card_title);
	});
});
