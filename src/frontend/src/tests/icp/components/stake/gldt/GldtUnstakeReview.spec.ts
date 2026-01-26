import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import GldtUnstakeReview from '$icp/components/stake/gldt/GldtUnstakeReview.svelte';
import {
	GLDT_STAKE_CONTEXT_KEY,
	initGldtStakeStore,
	type GldtStakeContext
} from '$icp/stores/gldt-stake.store';
import { STAKE_REVIEW_FORM_BUTTON } from '$lib/constants/test-ids.constants';
import { SEND_CONTEXT_KEY, initSendContext, type SendContext } from '$lib/stores/send.store';
import { stakePositionMockResponse } from '$tests/mocks/gldt_stake.mock';
import en from '$tests/mocks/i18n.mock';
import { render } from '@testing-library/svelte';

describe('GldtUnstakeReview', () => {
	const mockContext = () => {
		const store = initGldtStakeStore();
		store.setPosition(stakePositionMockResponse);

		return new Map<symbol, SendContext | GldtStakeContext>([
			[SEND_CONTEXT_KEY, initSendContext({ token: ICP_TOKEN })],
			[GLDT_STAKE_CONTEXT_KEY, { store }]
		]);
	};

	const props = {
		amount: 0.01,
		dissolveInstantly: false,
		amountToReceive: 0.01,
		onBack: () => {},
		onUnstake: () => {}
	};

	it('should keep the next button clickable if all requirements are met', () => {
		const { getByTestId } = render(GldtUnstakeReview, {
			props,
			context: mockContext()
		});

		expect(getByTestId(STAKE_REVIEW_FORM_BUTTON)).not.toHaveAttribute('disabled');
	});

	it('should disable the next button clickable if amount is incorrect', () => {
		const { getByTestId } = render(GldtUnstakeReview, {
			props: {
				...props,
				amount: undefined
			},
			context: mockContext()
		});

		expect(getByTestId(STAKE_REVIEW_FORM_BUTTON)).toHaveAttribute('disabled');
	});

	it('should disable the next button clickable if amount is less than zero', () => {
		const { getByTestId } = render(GldtUnstakeReview, {
			props: {
				...props,
				amount: -1
			},
			context: mockContext()
		});

		expect(getByTestId(STAKE_REVIEW_FORM_BUTTON)).toHaveAttribute('disabled');
	});

	it('should disable the next button clickable if amount is zero', () => {
		const { getByTestId } = render(GldtUnstakeReview, {
			props: {
				...props,
				amount: 0
			},
			context: mockContext()
		});

		expect(getByTestId(STAKE_REVIEW_FORM_BUTTON)).toHaveAttribute('disabled');
	});

	it('should display immediate dissolve fee if flag is true', () => {
		const { getByText } = render(GldtUnstakeReview, {
			props: {
				...props,
				dissolveInstantly: true
			},
			context: mockContext()
		});

		expect(getByText(en.stake.text.included_dissolve_fee)).toBeInTheDocument();
	});

	it('should not display immediate dissolve fee if flag is false', () => {
		const { getByText } = render(GldtUnstakeReview, {
			props,
			context: mockContext()
		});

		expect(() => getByText(en.stake.text.included_dissolve_fee)).toThrowError();
	});

	it('should display correct network name', () => {
		const { getByText } = render(GldtUnstakeReview, {
			props,
			context: mockContext()
		});

		expect(getByText(ICP_TOKEN.network.name)).toBeInTheDocument();
	});
});
