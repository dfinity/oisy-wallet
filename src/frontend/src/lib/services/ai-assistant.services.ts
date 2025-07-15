import type { chat_message_v1 } from '$declarations/llm/llm.did';
import { llmChat } from '$lib/api/llm.api';
import { AI_ASSISTANT_LLM_MODEL } from '$lib/constants/ai-assistant.constants';
import type { Identity } from '@dfinity/agent';
import { fromNullable, toNullable } from '@dfinity/utils';

export const askLlm = async ({
	messages,
	identity
}: {
	messages: chat_message_v1[];
	identity: Identity;
}): Promise<string | undefined> => {
	const {
		message: { content }
	} = await llmChat({
		request: {
			model: AI_ASSISTANT_LLM_MODEL,
			messages,
			// TODO: implement tools
			tools: toNullable()
		},
		identity
	});

	return fromNullable(content);
};
