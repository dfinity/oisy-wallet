import type { chat_response_v1 } from '$declarations/llm/llm.did';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import { llmChat } from '$lib/api/llm.api';
import * as balancesDerived from '$lib/derived/balances.derived';
import { extendedAddressContacts } from '$lib/derived/contacts.derived';
import * as aiAssistantServices from '$lib/services/ai-assistant.services';
import { aiAssistantStore } from '$lib/stores/ai-assistant.store';
import { contactsStore } from '$lib/stores/contacts.store';
import type { ToolCallArgument } from '$lib/types/ai-assistant';
import type { ContactUi } from '$lib/types/contact';
import { getMockContactsUi, mockContactBtcAddressUi } from '$tests/mocks/contacts.mock';
import { mockEthAddress } from '$tests/mocks/eth.mock';
import en from '$tests/mocks/i18n.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { fromNullable, toNullable } from '@dfinity/utils';
import { get, readable } from 'svelte/store';

vi.mock('$lib/api/llm.api');

describe('ai-assistant.services', () => {
	const mockRandomUUID = 'd7775002-80bf-4208-a2f0-84225281677a';

	const showFilteredContactsToolCall = {
		id: 'test',
		function: {
			name: 'show_filtered_contacts',
			arguments: [{ name: 'addressIds', value: `["${mockRandomUUID}"]` }]
		}
	};
	const showAllContactsToolCall = {
		id: 'test',
		function: {
			name: 'show_all_contacts',
			arguments: []
		}
	};
	const showBalanceToolCall = {
		id: 'test',
		function: {
			name: 'show_balance',
			arguments: [{ name: 'tokenSymbol', value: 'ICP' }]
		}
	};
	const showTotalBalanceToolCall = {
		id: 'test',
		function: {
			name: 'show_balance',
			arguments: []
		}
	};
	const reviewSendTokensToolCall = (destination?: ToolCallArgument) => ({
		id: 'test',
		function: {
			name: 'review_send_tokens',
			arguments: [
				...(destination ? [destination] : []),
				{ name: 'amountNumber', value: '0.01' },
				{ name: 'tokenSymbol', value: 'ETH' },
				{ name: 'networkId', value: 'ETH' }
			]
		}
	});

	describe('askLlm', () => {
		beforeEach(() => {
			vi.resetAllMocks();
		});

		it('parses API response without tool_calls correctly', async () => {
			const response = {
				message: {
					content: toNullable('content'),
					tool_calls: toNullable()
				}
			} as chat_response_v1;

			vi.mocked(llmChat).mockResolvedValue(response);

			const result = await aiAssistantServices.askLlm({
				identity: mockIdentity,
				messages: [{ user: { content: 'test' } }]
			});

			expect(llmChat).toHaveBeenCalledOnce();
			expect(result).toStrictEqual({
				text: fromNullable(response.message.content),
				tool: {
					calls: [],
					results: []
				}
			});
		});

		it('parses API response with tool_calls correctly', async () => {
			const response = {
				message: {
					content: toNullable(),
					tool_calls: toNullable(showAllContactsToolCall)
				}
			} as chat_response_v1;

			vi.mocked(llmChat).mockResolvedValue(response);

			const result = await aiAssistantServices.askLlm({
				identity: mockIdentity,
				messages: [{ user: { content: 'test' } }]
			});

			expect(llmChat).toHaveBeenCalledOnce();
			expect(result).toStrictEqual({
				text: fromNullable(response.message.content),
				tool: {
					calls: [showAllContactsToolCall],
					results: [
						{
							result: { contacts: [] },
							type: 'show_all_contacts'
						}
					]
				}
			});
		});

		it('parses only one tool call if the limit for a tool has been reached', async () => {
			const response = {
				message: {
					content: toNullable(),
					tool_calls: [showAllContactsToolCall, showAllContactsToolCall, showAllContactsToolCall]
				}
			} as chat_response_v1;

			vi.mocked(llmChat).mockResolvedValue(response);

			const result = await aiAssistantServices.askLlm({
				identity: mockIdentity,
				messages: [{ user: { content: 'test' } }]
			});

			expect(result).toStrictEqual({
				text: fromNullable(response.message.content),
				tool: {
					calls: [showAllContactsToolCall, showAllContactsToolCall, showAllContactsToolCall],
					results: [
						{
							result: { contacts: [] },
							type: 'show_all_contacts'
						}
					]
				}
			});
		});

		it('asks the user to type the address when the send review has an address the user did not type', async () => {
			aiAssistantStore.reset();

			const toolCall = reviewSendTokensToolCall({ name: 'address', value: mockEthAddress });
			const response = {
				message: {
					content: toNullable(),
					tool_calls: [toolCall]
				}
			} as chat_response_v1;

			vi.mocked(llmChat).mockResolvedValue(response);

			const result = await aiAssistantServices.askLlm({
				identity: mockIdentity,
				messages: [{ user: { content: 'test' } }]
			});

			expect(result).toStrictEqual({
				text: en.ai_assistant.text.type_send_address_message,
				tool: {
					calls: [toolCall],
					results: []
				}
			});
		});

		it('keeps the address request next to the results of other tools', async () => {
			aiAssistantStore.reset();

			const toolCall = reviewSendTokensToolCall({ name: 'address', value: mockEthAddress });
			const response = {
				message: {
					content: toNullable('content'),
					tool_calls: [toolCall, showAllContactsToolCall]
				}
			} as chat_response_v1;

			vi.mocked(llmChat).mockResolvedValue(response);

			const result = await aiAssistantServices.askLlm({
				identity: mockIdentity,
				messages: [{ user: { content: 'test' } }]
			});

			expect(result).toStrictEqual({
				text: en.ai_assistant.text.type_send_address_message,
				tool: {
					calls: [toolCall, showAllContactsToolCall],
					results: [
						{
							result: { contacts: [] },
							type: 'show_all_contacts'
						}
					]
				}
			});
		});

		it('leaves out the model text next to tool results', async () => {
			const response = {
				message: {
					content: toNullable('content'),
					tool_calls: [showAllContactsToolCall]
				}
			} as chat_response_v1;

			vi.mocked(llmChat).mockResolvedValue(response);

			const result = await aiAssistantServices.askLlm({
				identity: mockIdentity,
				messages: [{ user: { content: 'test' } }]
			});

			expect(result.text).toBeUndefined();
		});
	});

	describe('executeTool', () => {
		const contacts = getMockContactsUi({
			n: 1,
			name: 'Test name',
			addresses: [mockContactBtcAddressUi]
		}) as unknown as ContactUi[];

		beforeEach(() => {
			contactsStore.reset();
			vi.clearAllMocks();

			vi.spyOn(globalThis.crypto, 'randomUUID').mockImplementation(() => mockRandomUUID);
			contactsStore.set([...contacts]);
		});

		it('parses show_all_contacts tool and returns all contacts', () => {
			const result = aiAssistantServices.executeTool({
				toolCall: showAllContactsToolCall,
				requestStartTimestamp: 1000
			});

			expect(result).toEqual({
				type: 'show_all_contacts',
				result: {
					contacts: Object.values(get(extendedAddressContacts))
				}
			});
		});

		it('parses show_filtered_contacts tool and returns contacts', () => {
			const result = aiAssistantServices.executeTool({
				toolCall: showFilteredContactsToolCall,
				requestStartTimestamp: 1000
			});

			expect(result).toEqual({
				type: 'show_filtered_contacts',
				result: {
					contacts: Object.values(get(extendedAddressContacts))
				}
			});
		});

		it('parses show_balance tool and returns the expected data', () => {
			const result = aiAssistantServices.executeTool({
				toolCall: showBalanceToolCall,
				requestStartTimestamp: 1000
			});

			expect(result).toEqual({
				type: 'show_balance',
				result: {
					mainCard: {
						token: { ...ICP_TOKEN, balance: undefined, usdBalance: undefined },
						totalUsdBalance: 0
					}
				}
			});
		});

		it('reports the unfiltered show_balance total from the same store as the hero', () => {
			vi.spyOn(balancesDerived, 'enabledMainnetTotalUsdBalance', 'get').mockReturnValue(
				readable(1234.5)
			);

			const result = aiAssistantServices.executeTool({
				toolCall: showTotalBalanceToolCall,
				requestStartTimestamp: 1000
			});

			expect(result).toEqual({
				type: 'show_balance',
				result: {
					mainCard: {
						totalUsdBalance: 1234.5
					}
				}
			});
		});

		describe('review_send_tokens', () => {
			beforeEach(() => {
				aiAssistantStore.reset();
			});

			it('shows the send review for an address the user typed', () => {
				aiAssistantStore.appendMessage({
					role: 'user',
					data: { text: `Send 0.01 ETH to ${mockEthAddress}`, typedByUser: true }
				});

				const result = aiAssistantServices.executeTool({
					toolCall: reviewSendTokensToolCall({ name: 'address', value: mockEthAddress }),
					requestStartTimestamp: 1000
				});

				expect(result).toEqual({
					type: 'review_send_tokens',
					result: expect.objectContaining({ address: mockEthAddress, amount: 0.01 })
				});
			});

			it('returns no send review for an address the user did not type', () => {
				aiAssistantStore.appendMessage({
					role: 'user',
					data: { text: 'Send 0.01 ETH', typedByUser: true }
				});

				const result = aiAssistantServices.executeTool({
					toolCall: reviewSendTokensToolCall({ name: 'address', value: mockEthAddress }),
					requestStartTimestamp: 1000
				});

				expect(result).toBeUndefined();
			});

			it('returns no send review without a destination', () => {
				const result = aiAssistantServices.executeTool({
					toolCall: reviewSendTokensToolCall(),
					requestStartTimestamp: 1000
				});

				expect(result).toBeUndefined();
			});

			it('shows the send review for a contact address', () => {
				const result = aiAssistantServices.executeTool({
					toolCall: reviewSendTokensToolCall({
						name: 'selectedContactAddressId',
						value: mockRandomUUID
					}),
					requestStartTimestamp: 1000
				});

				expect(result).toEqual({
					type: 'review_send_tokens',
					result: expect.objectContaining({
						contactAddress: expect.objectContaining({ id: mockRandomUUID }),
						amount: 0.01
					})
				});
			});
		});
	});
});
