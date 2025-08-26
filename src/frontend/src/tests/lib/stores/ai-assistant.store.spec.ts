import { aiAssistantStore } from '$lib/stores/ai-assistant.store';
import type { ChatMessage } from '$lib/types/ai-assistant';
import { mockPage } from '$tests/mocks/page.store.mock';
import { testDerivedUpdates } from '$tests/utils/derived.test-utils';
import { get } from 'svelte/store';

describe('ai-assistant.store', () => {
	const defaultState = {
		isOpen: false,
		chatHistory: []
	};

	beforeEach(() => {
		mockPage.reset();
	});

	it('should ensure derived stores update at most once when the store changes', async () => {
		await testDerivedUpdates(() => aiAssistantStore);
	});

	it('should have correct initial values', () => {
		expect(get(aiAssistantStore)).toStrictEqual(defaultState);
	});

	it('should open and close AI assistant console', () => {
		aiAssistantStore.open();

		expect(get(aiAssistantStore)).toStrictEqual({
			...defaultState,
			isOpen: true
		});

		aiAssistantStore.close();

		expect(get(aiAssistantStore)).toStrictEqual(defaultState);
	});

	it('should append a message', () => {
		const message = {
			role: 'user',
			data: { text: 'hey' }
		} as ChatMessage;

		aiAssistantStore.appendMessage(message);

		expect(get(aiAssistantStore)).toStrictEqual({
			...defaultState,
			chatHistory: [...defaultState.chatHistory, message]
		});
	});
});
