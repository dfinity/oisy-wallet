import type {
	_SERVICE as OisyTradeService,
	Token,
	TradingPairInfo,
	UserTokenBalance
} from '$declarations/oisy_trade/oisy_trade.did';
import { idlFactory as idlCertifiedFactoryOisyTrade } from '$declarations/oisy_trade/oisy_trade.factory.certified.did';
import { idlFactory as idlFactoryOisyTrade } from '$declarations/oisy_trade/oisy_trade.factory.did';
import { getAgent } from '$lib/actors/agents.ic';
import { mapOisyTradeError } from '$lib/canisters/oisy-trade.errors';
import type { CreateCanisterOptions } from '$lib/types/canister';
import { Canister, createServices } from '@dfinity/utils';

export class OisyTradeCanister extends Canister<OisyTradeService> {
	static async create({
		identity,
		...options
	}: CreateCanisterOptions<OisyTradeService>): Promise<OisyTradeCanister> {
		const agent = await getAgent({ identity });

		const { service, certifiedService, canisterId } = createServices<OisyTradeService>({
			options: {
				...options,
				agent
			},
			idlFactory: idlFactoryOisyTrade,
			certifiedIdlFactory: idlCertifiedFactoryOisyTrade
		});

		return new OisyTradeCanister(canisterId, service, certifiedService);
	}

	getTradingPairs = (): Promise<TradingPairInfo[]> => {
		const { get_trading_pairs } = this.caller({ certified: false });

		return get_trading_pairs();
	};

	listSupportedTokens = (): Promise<Token[]> => {
		const { list_supported_tokens } = this.caller({ certified: false });

		return list_supported_tokens();
	};

	getBalances = async (): Promise<UserTokenBalance[]> => {
		const { get_balances } = this.caller({ certified: false });

		const response = await get_balances([]);

		if ('Ok' in response) {
			return response.Ok;
		}

		throw mapOisyTradeError(response.Err);
	};
}
