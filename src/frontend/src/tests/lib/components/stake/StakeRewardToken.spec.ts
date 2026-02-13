import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import StakeRewardToken from '$lib/components/stake/StakeRewardToken.svelte';
import { ZERO } from '$lib/constants/app.constants';
import { formatToken } from '$lib/utils/format.utils';
import { getTokenDisplaySymbol } from '$lib/utils/token.utils';
import { render } from '@testing-library/svelte';

describe('StakeRewardToken', () => {
	const props = {
		token: ICP_TOKEN,
		amount: 1000n
	};

	it('renders data correctly if amount is correct', () => {
		const { container } = render(StakeRewardToken, {
			props
		});

		expect(container).toHaveTextContent(getTokenDisplaySymbol(ICP_TOKEN));
		expect(container).toHaveTextContent(ICP_TOKEN.name);
		expect(container).toHaveTextContent(ICP_TOKEN.network.name);
		expect(container).toHaveTextContent(
			formatToken({
				value: props.amount,
				unitName: ICP_TOKEN.decimals
			})
		);
		expect(container).toHaveTextContent('< $0.01');
	});

	it('renders data correctly if amount is zero', () => {
		const { container } = render(StakeRewardToken, {
			props: {
				...props,
				amount: ZERO
			}
		});

		expect(container).toHaveTextContent(getTokenDisplaySymbol(ICP_TOKEN));
		expect(container).toHaveTextContent(ICP_TOKEN.name);
		expect(container).toHaveTextContent(ICP_TOKEN.network.name);
		expect(container).toHaveTextContent(
			formatToken({
				value: ZERO,
				unitName: ICP_TOKEN.decimals
			})
		);
		expect(container).toHaveTextContent('$0.00');
	});
});
