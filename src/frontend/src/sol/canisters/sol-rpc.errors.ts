import type { RpcError, RpcSource } from '$declarations/sol_rpc/sol_rpc.did';
import { CanisterInternalError } from '$lib/canisters/errors';
import { fromNullable, jsonReplacer } from '@dfinity/utils';

export const assertConsistentResponse: <T>(
	response: { Consistent: T } | { Inconsistent: Array<[RpcSource, T]> }
) => asserts response is { Consistent: T } = <T>(
	response: { Consistent: T } | { Inconsistent: Array<[RpcSource, T]> }
): void => {
	if ('Inconsistent' in response) {
		throw new Error('Sol RPC response should be consistent');
	}
};

export class SolRpcCanisterError extends CanisterInternalError {
	constructor(err: RpcError) {
		if ('JsonRpcError' in err) {
			super(`JSON RPC error: ${JSON.stringify(err.JsonRpcError, jsonReplacer)}`);
			return;
		}

		if ('ProviderError' in err) {
			if ('TooFewCycles' in err.ProviderError) {
				super(
					`Provider error: Too few cycles, expected ${err.ProviderError.TooFewCycles.expected}, received ${err.ProviderError.TooFewCycles.received}`
				);
			} else if ('InvalidRpcConfig' in err.ProviderError) {
				super(`Provider error: Invalid RPC config: ${err.ProviderError.InvalidRpcConfig}`);
			} else if ('UnsupportedCluster' in err.ProviderError) {
				super(`Provider error: Unsupported cluster: ${err.ProviderError.UnsupportedCluster}`);
			} else {
				super(`Provider error: ${JSON.stringify(err.ProviderError, jsonReplacer)}`);
			}
			return;
		}

		if ('ValidationError' in err) {
			super(`Validation error: ${err.ValidationError}`);
			return;
		}

		if ('HttpOutcallError' in err) {
			if ('IcError' in err.HttpOutcallError) {
				super(
					`HTTP outcall error: IC error with code ${err.HttpOutcallError.IcError.code} and message: ${err.HttpOutcallError.IcError.message}`
				);
			} else if ('InvalidHttpJsonRpcResponse' in err.HttpOutcallError) {
				super(
					`HTTP outcall error: Invalid HTTP JSON RPC response with status ${err.HttpOutcallError.InvalidHttpJsonRpcResponse.status}, body: ${err.HttpOutcallError.InvalidHttpJsonRpcResponse.body}, parsing error: ${fromNullable(err.HttpOutcallError.InvalidHttpJsonRpcResponse.parsingError)}`
				);
			} else {
				super(`HTTP outcall error: ${JSON.stringify(err.HttpOutcallError, jsonReplacer)}`);
			}
			return;
		}

		// Force compiler error on unhandled cases based on leftover types
		const _: never = err;

		super('Unknown SOL RPC Error');
	}
}
