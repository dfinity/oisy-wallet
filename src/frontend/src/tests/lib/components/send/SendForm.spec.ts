import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import SendForm from '$lib/components/send/SendForm.svelte';
import { SEND_DESTINATION_SECTION } from '$lib/constants/test-ids.constants';
import { SEND_CONTEXT_KEY, initSendContext, type SendContext } from '$lib/stores/send.store';
import type { Token } from '$lib/types/token';
import { mockValidErc20Token } from '$tests/mocks/erc20-tokens.mock';
import { mockEthAddress } from '$tests/mocks/eth.mock';
import en from '$tests/mocks/i18n.mock';
import { createMockSnippet, mockSnippet } from '$tests/mocks/snippet.mock';
import { render } from '@testing-library/svelte';

describe('SendForm', () => {
	const priorityTestId = 'priority-snippet';
	const feeTestId = 'fee-snippet';

	const props = {
		destination: mockEthAddress,
		onBack: vi.fn(),
		onNext: vi.fn(),
		sendAmount: mockSnippet,
		priority: createMockSnippet(priorityTestId),
		fee: createMockSnippet(feeTestId),
		cancel: createMockSnippet('cancel-snippet')
	};

	const mockContext = (token: Token) =>
		new Map<symbol, SendContext>([[SEND_CONTEXT_KEY, initSendContext({ token })]]);

	const expectInDocumentOrder = (elements: Element[]) =>
		elements
			.slice(1)
			.forEach((element, i) =>
				expect(
					elements[i].compareDocumentPosition(element) & Node.DOCUMENT_POSITION_FOLLOWING
				).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
			);

	it('shows the network, the token and its address between the destination and the fee', () => {
		const { getByTestId, getByText } = render(SendForm, {
			props,
			context: mockContext(mockValidErc20Token)
		});

		const destination = getByTestId(SEND_DESTINATION_SECTION);
		const network = getByText(en.send.text.network);
		const token = getByText(en.tokens.details.token);
		const address = getByText(en.tokens.text.token_address);
		const priority = getByTestId(priorityTestId);
		const fee = getByTestId(feeTestId);

		expectInDocumentOrder([destination, network, token, address, priority, fee]);
	});

	it('names the network of the token being sent', () => {
		const { getByText } = render(SendForm, {
			props,
			context: mockContext(mockValidErc20Token)
		});

		expect(getByText(mockValidErc20Token.network.name)).toBeInTheDocument();
	});

	it('shows no token address for a native coin', () => {
		const { getByText, queryByText } = render(SendForm, {
			props,
			context: mockContext(ETHEREUM_TOKEN)
		});

		expect(getByText(en.tokens.details.token)).toBeInTheDocument();
		expect(queryByText(en.tokens.text.token_address)).not.toBeInTheDocument();
	});
});
