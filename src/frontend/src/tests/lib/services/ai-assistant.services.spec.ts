import type { chat_response_v1 } from '$declarations/llm/llm.did';
import { llmChat } from '$lib/api/llm.api';
import { extendedAddressContacts } from '$lib/derived/contacts.derived';
import { askLlm, executeTool } from '$lib/services/ai-assistant.services';
import { contactsStore } from '$lib/stores/contacts.store';
import type { ContactUi } from '$lib/types/contact';
import { getMockContactsUi, mockContactBtcAddressUi } from '$tests/mocks/contacts.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { fromNullable, toNullable } from '@dfinity/utils';
import { get } from 'svelte/store';

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
					tool_calls: toNullable(showAllContactsToolCall)
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
			const result = executeTool({
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
			const result = executeTool({
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
	});
});
