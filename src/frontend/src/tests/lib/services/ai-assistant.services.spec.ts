import type { chat_response_v1 } from '$declarations/llm/llm.did';
import { llmChat } from '$lib/api/llm.api';
import { extendedAddressContacts } from '$lib/derived/contacts.derived';
import { askLlm, askLlmToFilterContacts } from '$lib/services/ai-assistant.services';
import { contactsStore } from '$lib/stores/contacts.store';
import type { ContactUi } from '$lib/types/contact';
import { parseToAiAssistantContacts } from '$lib/utils/ai-assistant.utils';
import { getMockContactsUi, mockContactBtcAddressUi } from '$tests/mocks/contacts.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { fromNullable, jsonReplacer, toNullable } from '@dfinity/utils';
import { get } from 'svelte/store';

vi.mock('$lib/api/llm.api');

describe('ai-assistant.services', () => {
	describe('askLlm', () => {
		beforeEach(() => {
			vi.resetAllMocks();
		});

		it('calls API correctly', async () => {
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

			expect(result).toStrictEqual([...Object.values(storeData)]);
		});
	});
});
