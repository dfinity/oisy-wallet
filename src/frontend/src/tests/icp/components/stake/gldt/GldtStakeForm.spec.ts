import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import GldtStakeForm from '$icp/components/stake/gldt/GldtStakeForm.svelte';
import {
	GLDT_STAKE_CONTEXT_KEY,
	initGldtStakeStore,
	type GldtStakeContext
} from '$icp/stores/gldt-stake.store';
import * as appConstants from '$lib/constants/app.constants';
import {
	STAKE_FORM_REVIEW_BUTTON,
	TOKEN_INPUT_CURRENCY_TOKEN
} from '$lib/constants/test-ids.constants';
import { SEND_CONTEXT_KEY, initSendContext, type SendContext } from '$lib/stores/send.store';
import { mockLedgerCanisterId } from '$tests/mocks/ic-tokens.mock';
import { mockPrincipalText } from '$tests/mocks/identity.mock';
import { fireEvent, render, waitFor } from '@testing-library/svelte';

describe('GldtStakeForm', () => {
	const mockContext = () =>
		new Map<symbol, SendContext | GldtStakeContext>([
			[SEND_CONTEXT_KEY, initSendContext({ token: ICP_TOKEN })],
			[GLDT_STAKE_CONTEXT_KEY, { store: initGldtStakeStore() }]
		]);

	const props = {
		amount: 0.01,
		destination: mockPrincipalText,
		onClose: () => {},
		onNext: () => {}
	};

	beforeEach(() => {
		vi.resetAllMocks();

		vi.spyOn(appConstants, 'GLDT_STAKE_CANISTER_ID', 'get').mockImplementation(
			() => mockLedgerCanisterId
		);
	});

	it('should keep the next button clickable if all requirements are met', () => {
		const { getByTestId } = render(GldtStakeForm, {
			props,
			context: mockContext()
		});

		expect(getByTestId(STAKE_FORM_REVIEW_BUTTON)).not.toHaveAttribute('disabled');
	});

	it('should disable the next button clickable if amount is incorrect', () => {
		const { getByTestId } = render(GldtStakeForm, {
			props: {
				...props,
				amount: undefined
			},
			context: mockContext()
		});

		expect(getByTestId(STAKE_FORM_REVIEW_BUTTON)).toHaveAttribute('disabled');
	});

	it('should disable the next button clickable if balance is lower than provided amount', async () => {
		const { getByTestId } = render(GldtStakeForm, {
			props,
			context: mockContext()
		});

		const input = getByTestId(TOKEN_INPUT_CURRENCY_TOKEN);

		await fireEvent.input(input, { target: { value: '9999999' } });

		await waitFor(() => {
			expect(getByTestId(STAKE_FORM_REVIEW_BUTTON)).toHaveAttribute('disabled');
		});
	});
});
