import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import { trackEthTransactionSendOutOfGas } from '$eth/services/eth-transaction-send-analytics.services';
import { PLAUSIBLE_EVENT_CONTEXTS, PLAUSIBLE_EVENTS } from '$lib/enums/plausible';
import * as analytics from '$lib/services/analytics.services';
import { mockValidErc20Token } from '$tests/mocks/erc20-tokens.mock';
import type { MockInstance } from 'vitest';

describe('trackEthTransactionSendOutOfGas', () => {
	let track: MockInstance;

	const nodeMessage = 'out of gas: gas required exceeds: 60243';

	beforeEach(() => {
		vi.restoreAllMocks();
		track = vi.spyOn(analytics, 'trackEvent').mockImplementation(() => undefined);
	});

	it('sends the flow, both gas figures, the token and the node answer, and nothing else', () => {
		trackEthTransactionSendOutOfGas({
			context: PLAUSIBLE_EVENT_CONTEXTS.SEND,
			token: mockValidErc20Token,
			gasSent: 60_243n,
			gasNeeded: 62_989n,
			errorCode: -32000,
			nodeMessage
		});

		expect(track).toHaveBeenCalledExactlyOnceWith({
			name: PLAUSIBLE_EVENTS.TRANSACTION_SEND,
			metadata: {
				event_context: 'send',
				event_severity: 'error',
				event_key: 'gas_sent',
				event_value: '60243',
				event_key2: 'gas_needed',
				event_value2: '62989',
				token_network: mockValidErc20Token.network.name,
				token_standard: 'erc20',
				token_symbol: mockValidErc20Token.symbol,
				token_address: mockValidErc20Token.address,
				result_status: 'error',
				result_error_severity: 'major',
				result_error_type: 'out_of_gas',
				result_error_code: '-32000',
				result_error_text: nodeMessage
			}
		});
	});

	it('leaves out the gas needed when it could not be estimated', () => {
		trackEthTransactionSendOutOfGas({
			context: PLAUSIBLE_EVENT_CONTEXTS.CONVERT,
			token: mockValidErc20Token,
			gasSent: 60_243n,
			errorCode: -32000,
			nodeMessage
		});

		const [[{ metadata }]] = track.mock.calls;

		expect(metadata).toMatchObject({ event_key: 'gas_sent', event_value: '60243' });
		expect(metadata).not.toHaveProperty('event_key2');
		expect(metadata).not.toHaveProperty('event_value2');
	});

	it('leaves out both gas figures when the signed transaction was not at hand', () => {
		trackEthTransactionSendOutOfGas({
			context: PLAUSIBLE_EVENT_CONTEXTS.AI_ASSISTANT,
			token: mockValidErc20Token,
			errorCode: -32000,
			nodeMessage
		});

		const [[{ metadata }]] = track.mock.calls;

		expect(metadata).toMatchObject({ event_context: 'ai_assistant' });
		expect(metadata).not.toHaveProperty('event_key');
		expect(metadata).not.toHaveProperty('event_value');
	});

	it('sends no token address for a native token', () => {
		trackEthTransactionSendOutOfGas({
			context: PLAUSIBLE_EVENT_CONTEXTS.SEND,
			token: ETHEREUM_TOKEN,
			gasSent: 21_000n,
			errorCode: -32000,
			nodeMessage
		});

		const [[{ metadata }]] = track.mock.calls;

		expect(metadata).toMatchObject({ token_symbol: 'ETH', token_standard: 'ethereum' });
		expect(metadata).not.toHaveProperty('token_address');
	});

	it('replaces every hex value in the node message', () => {
		trackEthTransactionSendOutOfGas({
			context: PLAUSIBLE_EVENT_CONTEXTS.SEND,
			token: mockValidErc20Token,
			errorCode: -32000,
			nodeMessage: 'out of gas: address 0x1111111111111111111111111111111111111111 tx 0xDeadBeef'
		});

		const [[{ metadata }]] = track.mock.calls;

		expect(metadata).toMatchObject({ result_error_text: 'out of gas: address 0x… tx 0x…' });
	});
});
