import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import StakeForm from '$lib/components/stake/StakeForm.svelte';
import TokenInput from '$lib/components/tokens/TokenInput.svelte';
import { STAKE_FORM_REVIEW_BUTTON } from '$lib/constants/test-ids.constants';
import { SEND_CONTEXT_KEY, initSendContext, type SendContext } from '$lib/stores/send.store';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import en from '$tests/mocks/i18n.mock';
import { mockPrincipalText } from '$tests/mocks/identity.mock';
import { mockSnippet } from '$tests/mocks/snippet.mock';
import { render, waitFor } from '@testing-library/svelte';

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

describe('TokenInput network row', () => {
	const onNetwork = replacePlaceholders(en.tokens.text.on_network, {
		$network: ICP_TOKEN.network.name
	}).trim();

	const props = {
		token: ICP_TOKEN,
		amount: undefined,
		amountInfo: mockSnippet,
		balance: mockSnippet
	};

	// The amount check waits for typing to pause; fake timers keep it from firing after a test.
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("names the token's network, opening with a capital", () => {
		const { getByText } = render(TokenInput, { props: { ...props, showTokenNetwork: true } });

		expect(getByText(onNetwork)).toHaveClass('first-letter:uppercase');
	});

	it('leaves the network out unless asked to show it', () => {
		const { queryByText } = render(TokenInput, { props });

		expect(queryByText(onNetwork)).not.toBeInTheDocument();
	});

	it('leaves the network out while no token is picked', () => {
		const { queryByText } = render(TokenInput, {
			props: { ...props, token: undefined, showTokenNetwork: true }
		});

		expect(queryByText(onNetwork)).not.toBeInTheDocument();
	});
});
