import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import GldtStakeReview from '$icp/components/stake/gldt/GldtStakeReview.svelte';
import { STAKE_REVIEW_FORM_BUTTON } from '$lib/constants/test-ids.constants';
import { SEND_CONTEXT_KEY, initSendContext, type SendContext } from '$lib/stores/send.store';
import { mockPrincipalText } from '$tests/mocks/identity.mock';
import { mockSplAddress } from '$tests/mocks/sol.mock';
import { render } from '@testing-library/svelte';

describe('GldtStakeReview', () => {
	const mockContext = () =>
		new Map<symbol, SendContext>([[SEND_CONTEXT_KEY, initSendContext({ token: ICP_TOKEN })]]);

	const props = {
		amount: 0.01,
		destination: mockPrincipalText,
		onBack: () => {},
		onStake: () => {}
	};

	it('should keep the next button clickable if all requirements are met', () => {
		const { getByTestId } = render(GldtStakeReview, {
			props,
			context: mockContext()
		});

		expect(getByTestId(STAKE_REVIEW_FORM_BUTTON)).not.toHaveAttribute('disabled');
	});

	it('should disable the next button clickable if amount is incorrect', () => {
		const { getByTestId } = render(GldtStakeReview, {
			props: {
				...props,
				amount: undefined
			},
			context: mockContext()
		});

		expect(getByTestId(STAKE_REVIEW_FORM_BUTTON)).toHaveAttribute('disabled');
	});

	it('should disable the next button clickable if destination is incorrect', () => {
		const { getByTestId } = render(GldtStakeReview, {
			props: {
				...props,
				destination: mockSplAddress
			},
			context: mockContext()
		});

		expect(getByTestId(STAKE_REVIEW_FORM_BUTTON)).toHaveAttribute('disabled');
	});
});
