import type {
	_SERVICE as LlmService,
	chat_request_v1,
	chat_response_v1
} from '$declarations/llm/llm.did';
import { LlmCanister } from '$lib/canisters/llm.canister';
import type { CreateCanisterOptions } from '$lib/types/canister';
import { mockIdentity } from '$tests/mocks/identity.mock';
import type { ActorSubclass } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { mock } from 'vitest-mock-extended';

describe('llm.canister', () => {
	const createLlmCanister = ({
		serviceOverride
	}: Pick<CreateCanisterOptions<LlmService>, 'serviceOverride'>) =>
		LlmCanister.create({
			canisterId: Principal.fromText('4mmnk-kiaaa-aaaag-qbllq-cai'),
			identity: mockIdentity,
			serviceOverride,
			certifiedServiceOverride: serviceOverride
		});

	const service = mock<ActorSubclass<LlmService>>();
	const mockResponseError = new Error('LLM error');
	const params = {
		model: 'test',
		tools: [],
		messages: [{ user: { content: 'hello' } }]
	} as chat_request_v1;

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('v1_chat', () => {
		it('returns chat data successfully', async () => {
			const response = {
				message: {
					content: ['hello'],
					tool_calls: []
				}
			} as chat_response_v1;

			service.v1_chat.mockResolvedValue(response);

			const { chat } = await createLlmCanister({ serviceOverride: service });

			const result = await chat(params);

			expect(result).toEqual(response);
			expect(service.v1_chat).toHaveBeenCalledWith(params);
		});

		it('throws an error if v1_chat method fails', async () => {
			service.v1_chat.mockImplementation(async () => {
				await Promise.resolve();
				throw mockResponseError;
			});

			const { chat } = await createLlmCanister({
				serviceOverride: service
			});

			const res = chat(params);

			await expect(res).rejects.toThrow(mockResponseError);
		});
	});
});
