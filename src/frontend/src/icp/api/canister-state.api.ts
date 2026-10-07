import type { CanisterExistence } from '$icp/types/cycles-top-up';
import { getAgent } from '$lib/actors/agents.ic';
import { consoleError } from '$lib/utils/console.utils';
import { isNullish } from '@dfinity/utils';
import {
	AgentError,
	CanisterStatus,
	Certificate,
	HttpErrorCode,
	LookupPathStatus,
	type HttpAgent,
	type Identity
} from '@icp-sdk/core/agent';
import type { Principal } from '@icp-sdk/core/principal';

// What a boundary node answers for an ID that no subnet hosts, which includes every
// principal that is not a canister.
const BOUNDARY_NODE_CANISTER_NOT_FOUND = 'canister_not_found';

const isCanisterNotFound = (err: unknown): boolean =>
	err instanceof AgentError &&
	err.code instanceof HttpErrorCode &&
	err.code.status === 400 &&
	(err.code.bodyText ?? '').includes(BOUNDARY_NODE_CANISTER_NOT_FOUND);

/**
 * Tells whether a canister exists, from its public state, which needs no controller rights.
 *
 * Every canister has a list of controllers there, with or without code, so that is what is
 * read: a canister without code has no module hash. The subnet whose range holds an ID
 * proves that no canister has it; for an ID that no subnet hosts, the boundary node answers
 * that the canister does not exist. That answer is not certified, but a wrong one can only
 * block a top-up. Anything else, a failed call or a proof that does not verify, is
 * `unknown`.
 *
 * `CanisterStatus.request` cannot be used for this: it returns `null` both for a canister
 * that does not exist and for a read that failed.
 */
export const getCanisterExistence = async ({
	identity,
	canisterId
}: {
	identity: Identity;
	canisterId: Principal;
}): Promise<CanisterExistence> => {
	let agent: HttpAgent;

	try {
		agent = await getAgent({ identity });
	} catch (err: unknown) {
		consoleError(err);

		return 'unknown';
	}

	const path = CanisterStatus.encodePath('controllers', canisterId);

	let certificate: Uint8Array;

	try {
		({ certificate } = await agent.readState(canisterId, { paths: [path] }));
	} catch (err: unknown) {
		if (isCanisterNotFound(err)) {
			return 'not_found';
		}

		consoleError(err);

		return 'unknown';
	}

	const { rootKey } = agent;

	if (isNullish(rootKey)) {
		return 'unknown';
	}

	try {
		const verified = await Certificate.create({ certificate, rootKey, canisterId, agent });

		const { status } = verified.lookup_path(path);

		return status === LookupPathStatus.Found
			? 'exists'
			: status === LookupPathStatus.Absent
				? 'not_found'
				: 'unknown';
	} catch (err: unknown) {
		consoleError(err);

		return 'unknown';
	}
};
