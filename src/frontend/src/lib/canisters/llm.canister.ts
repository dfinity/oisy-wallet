import type {
	_SERVICE as LlmService,
	chat_request_v1,
	chat_response_v1
} from '$declarations/llm/llm.did';
import { idlFactory as idlCertifiedFactoryLlm } from '$declarations/llm/llm.factory.certified.did';
import { getAgent } from '$lib/actors/agents.ic';
import type { CreateCanisterOptions } from '$lib/types/canister';
import { Canister, createServices } from '@dfinity/utils';

export class LlmCanister extends Canister<LlmService> {
	static async create({
		identity,
		...options
	}: CreateCanisterOptions<LlmService>): Promise<LlmCanister> {
		const agent = await getAgent({ identity });

		const { service, certifiedService, canisterId } = createServices<LlmService>({
			options: {
				...options,
				agent
			},
			idlFactory: idlCertifiedFactoryLlm,
			certifiedIdlFactory: idlCertifiedFactoryLlm
		});

		return new LlmCanister(canisterId, service, certifiedService);
	}

	chat = (request: chat_request_v1): Promise<chat_response_v1> => {
		const { v1_chat } = this.caller({ certified: true });

		return v1_chat(request);
	};
}
