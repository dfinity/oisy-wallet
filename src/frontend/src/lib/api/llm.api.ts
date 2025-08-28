import type { chat_request_v1, chat_response_v1 } from '$declarations/llm/llm.did';
import { LlmCanister } from '$lib/canisters/llm.canister';
import { LLM_CANISTER_ID } from '$lib/constants/app.constants';
import type { CanisterApiFunctionParams } from '$lib/types/canister';
import { Principal } from '@dfinity/principal';
import { assertNonNullish, isNullish } from '@dfinity/utils';

let canister: LlmCanister | undefined = undefined;

export const llmChat = async ({
	request,
	identity
}: CanisterApiFunctionParams<{
	request: chat_request_v1;
}>): Promise<chat_response_v1> => {
	const { chat } = await llmCanister({ identity });

	return chat(request);
};

const llmCanister = async ({
	identity,
	nullishIdentityErrorMessage,
	canisterId = LLM_CANISTER_ID
}: CanisterApiFunctionParams): Promise<LlmCanister> => {
	assertNonNullish(identity, nullishIdentityErrorMessage);

	if (isNullish(canister)) {
		canister = await LlmCanister.create({
			identity,
			canisterId: Principal.fromText(canisterId)
		});
	}

	return canister;
};
