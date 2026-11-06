import { POL_AMOY_TOKEN } from '$env/tokens/tokens-evm/tokens-polygon/tokens.pol.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import StakeForm from '$lib/components/stake/StakeForm.svelte';
import TokenInput from '$lib/components/tokens/TokenInput.svelte';
import {
	STAKE_FORM_REVIEW_BUTTON,
	TOKEN_INPUT_SELECT_TOKEN_BUTTON
} from '$lib/constants/test-ids.constants';
import { SEND_CONTEXT_KEY, initSendContext, type SendContext } from '$lib/stores/send.store';
import { getTokenDisplaySymbol } from '$lib/utils/token.utils';
import { mockPrincipalText } from '$tests/mocks/identity.mock';
import { mockSnippet } from '$tests/mocks/snippet.mock';
import { render, waitFor, within } from '@testing-library/svelte';

// TokenInput.validate() runs inside a 300ms debounced $effect. Parsing an
// out-of-range amount (e.g. `1e400`) used to throw ethers' `RangeError: overflow`
// there, surfacing as an unhandled async error that crashed validation (and the
// whole vitest run). These tests exercise the shared component through a host
// form to guard against a regression.
describe('TokenInput (via StakeForm) out-of-range amount', () => {
	const mockContext = () =>
		new Map<symbol, SendContext>([[SEND_CONTEXT_KEY, initSendContext({ token: ICP_TOKEN })]]);

	const props = {
		amount: '1e400',
		disabled: false,
		destination: mockPrincipalText,
		onClose: () => {},
		onNext: () => {}
	};

	it('does not throw an unhandled error and disables the review button', async () => {
		const { getByTestId } = render(StakeForm, {
			props,
			context: mockContext()
		});

		// Wait for the debounced validate() to run and mark the amount invalid.
		await waitFor(() => expect(getByTestId(STAKE_FORM_REVIEW_BUTTON)).toHaveAttribute('disabled'));
	});
});

describe('TokenInput', () => {
	const props = {
		token: POL_AMOY_TOKEN,
		amount: undefined,
		amountInfo: mockSnippet,
		balance: mockSnippet
	};

	const symbolInSelector = (getByTestId: (testId: string) => HTMLElement): HTMLElement =>
		within(getByTestId(TOKEN_INPUT_SELECT_TOKEN_BUTTON)).getByText(
			getTokenDisplaySymbol(POL_AMOY_TOKEN)
		);

	it('lets a long symbol in the selector wrap by default', () => {
		const { getByTestId } = render(TokenInput, { props });

		expect(symbolInSelector(getByTestId)).not.toHaveClass('truncate');
	});

	it('keeps the symbol in the selector on one line, cut with an ellipsis, when asked to', () => {
		const { getByTestId } = render(TokenInput, { props: { ...props, truncateSymbol: true } });

		expect(symbolInSelector(getByTestId)).toHaveClass('truncate');
	});
});
