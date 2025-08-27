import type { chat_response_v1 } from '$declarations/llm/llm.did';
import { llmChat } from '$lib/api/llm.api';
import { extendedAddressContacts } from '$lib/derived/contacts.derived';
import { askLlm, askLlmToFilterContacts, executeTool } from '$lib/services/ai-assistant.services';
import { contactsStore } from '$lib/stores/contacts.store';
import type { ContactUi } from '$lib/types/contact';
import { parseToAiAssistantContacts } from '$lib/utils/ai-assistant.utils';
import { getMockContactsUi, mockContactBtcAddressUi } from '$tests/mocks/contacts.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { fromNullable, jsonReplacer, toNullable } from '@dfinity/utils';
import { get } from 'svelte/store';

vi.mock('$lib/api/llm.api');

describe('ai-assistant.services', () => {
	const toolCall = {
		id: 'test',
		function: {
			name: 'show_contacts',
			arguments: [{ value: 'Btc', name: 'addressType' }]
		}
	};
	const noAgumentsToolCall = {
		...toolCall,
		function: {
			...toolCall.function,
			arguments: []
		}
	};

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

			const result = await askLlm({
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
					tool_calls: toNullable(noAgumentsToolCall)
				}
			} as chat_response_v1;

			vi.mocked(llmChat).mockResolvedValue(response);

			const result = await askLlm({
				identity: mockIdentity,
				messages: [{ user: { content: 'test' } }]
			});

			expect(llmChat).toHaveBeenCalledOnce();
			expect(result).toStrictEqual({
				text: fromNullable(response.message.content),
				tool: {
					calls: [noAgumentsToolCall],
					results: [
						{
							result: { contacts: [] },
							type: 'show_contacts'
						}
					]
				}
			});
		});
	});

	describe('askLlmToFilterContacts', () => {
		beforeEach(() => {
			vi.resetAllMocks();

			vi.stubGlobal('crypto', {
				...crypto,
				randomUUID: () => '12345678-1234-1234-1234-123456789abc'
			});
		});

		it('returns filtered and parsed contacts', async () => {
			const contacts = getMockContactsUi({
				n: 1,
				name: 'Test name',
				addresses: [mockContactBtcAddressUi]
			}) as unknown as ContactUi[];

			contactsStore.set([...contacts]);

			const storeData = get(extendedAddressContacts);

			const aiAssistantContacts = parseToAiAssistantContacts(storeData);
			const response = {
				message: {
					content: toNullable(
						JSON.stringify(
							{
								contacts: Object.values(aiAssistantContacts).map((contact) => ({
									...contact,
									id: `${contact['id']}`
								}))
							},
							jsonReplacer
						)
					),
					tool_calls: toNullable()
				}
			} as chat_response_v1;

			vi.mocked(llmChat).mockResolvedValue(response);

			const result = await askLlmToFilterContacts({
				identity: mockIdentity,
				filterParams: [{ value: 'Btc', name: 'addressType' }]
			});

			expect(result).toStrictEqual({ contacts: Object.values(storeData), message: undefined });
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

			contactsStore.set([...contacts]);
		});

		it('parses show_contacts tool and returns all contacts if no filter params provided', async () => {
			const result = await executeTool({
				identity: mockIdentity,
				toolCall: noAgumentsToolCall
			});

			expect(result).toEqual({
				type: 'show_contacts',
				result: {
					contacts: Object.values(get(extendedAddressContacts))
				}
			});
		});

		it('parses show_contacts tool and returns contacts if filter params provided', async () => {
			const result = await executeTool({
				identity: mockIdentity,
				toolCall
			});

			expect(result).toEqual({
				type: 'show_contacts',
				result: {
					contacts: Object.values(get(extendedAddressContacts))
				}
			});
		});
	});
});
