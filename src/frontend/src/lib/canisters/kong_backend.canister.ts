import type {
	_SERVICE as KongBackendService,
	SwapAmountsReply,
	TokenReply
} from '$declarations/kong_backend/kong_backend.did';
import { idlFactory as idlCertifiedFactoryKongBackend } from '$declarations/kong_backend/kong_backend.factory.certified.did';
import { idlFactory as idlFactoryKongBackend } from '$declarations/kong_backend/kong_backend.factory.did';
import { getAgent } from '$lib/actors/agents.ic';
import { mapKongBackendCanisterError } from '$lib/canisters/kong_backend.errors';
import type { KongSwapAmountsParams, KongSwapParams } from '$lib/types/api';
import type { CreateCanisterOptions } from '$lib/types/canister';
import { getKongIcTokenIdentifier } from '$lib/utils/swap.utils';
import { Canister, createServices, toNullable } from '@dfinity/utils';

export class KongBackendCanister extends Canister<KongBackendService> {
	static async create({
		identity,
		...options
	}: CreateCanisterOptions<KongBackendService>): Promise<KongBackendCanister> {
		const agent = await getAgent({ identity });

		const { service, certifiedService, canisterId } = createServices<KongBackendService>({
			options: {
				...options,
				agent
			},
			idlFactory: idlFactoryKongBackend,
			certifiedIdlFactory: idlCertifiedFactoryKongBackend
		});

		return new KongBackendCanister(canisterId, service, certifiedService);
	}

	swapAmounts = async ({
		sourceToken,
		destinationToken,
		sourceAmount
	}: KongSwapAmountsParams): Promise<SwapAmountsReply> => {
		const { swap_amounts } = this.caller({
			certified: false
		});

		const response = await swap_amounts(
			getKongIcTokenIdentifier(sourceToken),
			sourceAmount,
			getKongIcTokenIdentifier(destinationToken)
		);

		if ('Ok' in response) {
			return response.Ok;
		}

		throw mapKongBackendCanisterError(response.Err);
	};

	swap = async ({
		destinationToken,
		maxSlippage,
		sendAmount,
		referredBy,
		receiveAmount,
		receiveAddress,
		sourceToken,
		payTransactionId
	}: KongSwapParams): Promise<bigint> => {
		const { swap_async } = this.caller({
			certified: true
		});

		const response = await swap_async({
			pay_token: getKongIcTokenIdentifier(sourceToken),
			receive_token: getKongIcTokenIdentifier(destinationToken),
			pay_amount: sendAmount,
			max_slippage: toNullable(maxSlippage),
			receive_address: toNullable(receiveAddress),
			receive_amount: toNullable(receiveAmount),
			pay_tx_id: toNullable(payTransactionId),
			referred_by: toNullable(referredBy)
		});

		if ('Ok' in response) {
			return response.Ok;
		}

		throw mapKongBackendCanisterError(response.Err);
	};

	tokens = async (tokenLedgerCanisterId?: string): Promise<TokenReply[]> => {
		const { tokens } = this.caller({
			certified: false
		});

		const response = await tokens(toNullable(tokenLedgerCanisterId));

		if ('Ok' in response) {
			return response.Ok;
		}

		throw mapKongBackendCanisterError(response.Err);
	};
}
