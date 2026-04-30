import { ARBITRUM_MAINNET_NETWORK_ID } from '$env/networks/networks-evm/networks.evm.arbitrum.env';
import { BASE_NETWORK_ID } from '$env/networks/networks-evm/networks.evm.base.env';
import { ONESEC_SWAP_ENABLED } from '$env/rest/onesec.env';
import type { Erc20Token } from '$eth/types/erc20';
import { isIcToken } from '$icp/validation/ic-token.validation';
import { ZERO } from '$lib/constants/app.constants';
import type { NetworkId } from '$lib/types/network';
import type { Token as AppToken } from '$lib/types/token';
import { isNullish, nonNullish } from '@dfinity/utils';
import { DEFAULT_CONFIG, type Token, type TokenConfig } from 'onesec-bridge';

export interface IcpLedgerEntry {
	token: Token;
	config: TokenConfig;
}

const buildIcpLedgerMap = (): Record<string, IcpLedgerEntry> =>
	[...DEFAULT_CONFIG.tokens].reduce<Record<string, IcpLedgerEntry>>((map, [token, config]) => {
		const ledger = config.ledgerMainnet ?? config.ledger;
		if (nonNullish(ledger)) {
			map[ledger] = { token, config };
		}
		return map;
	}, {});

export const ICP_LEDGER_TO_TOKEN = buildIcpLedgerMap();

export const computeReceiveAmount = ({
	amount,
	transferFeeInUnits,
	protocolFeeInPercent,
	decimals
}: {
	amount: bigint;
	transferFeeInUnits: bigint;
	protocolFeeInPercent: number;
	decimals: number;
}): bigint => {
	const amountInTokens = Number(amount) / 10 ** decimals;
	const protocolFee = BigInt(
		Math.ceil(amountInTokens * (protocolFeeInPercent / 100) * 10 ** decimals)
	);
	const totalFee = transferFeeInUnits + protocolFee;
	return amount > totalFee ? amount - totalFee : ZERO;
};

const getEvmAddressForNetwork = ({
	config,
	networkId
}: {
	config: TokenConfig;
	networkId: NetworkId;
}): string | undefined =>
	networkId === ARBITRUM_MAINNET_NETWORK_ID
		? (config.erc20MainnetArbitrum ?? config.erc20Mainnet ?? config.erc20)
		: networkId === BASE_NETWORK_ID
			? (config.erc20MainnetBase ?? config.erc20Mainnet ?? config.erc20)
			: (config.erc20MainnetEthereum ?? config.erc20Mainnet ?? config.erc20);

/**
 * Returns ICP ledger canister IDs of tokens supported by OneSec on the ICP side.
 */
export const oneSecIcpSupportedTokens = (): Promise<Set<string>> =>
	Promise.resolve(new Set(Object.keys(ICP_LEDGER_TO_TOKEN)));

/**
 * Returns ERC20 addresses (lowercased) of tokens supported by OneSec on the given EVM networks.
 */
export const oneSecEvmSupportedTokens = ({
	networkIds
}: {
	networkIds: NetworkId[];
}): Promise<Set<string>> => {
	const supported = new Set<string>();

	for (const networkId of networkIds) {
		for (const [, config] of DEFAULT_CONFIG.tokens) {
			const address = getEvmAddressForNetwork({ config, networkId });

			if (address) {
				supported.add(address.toLowerCase());
			}
		}
	}

	return Promise.resolve(supported);
};

/**
 * Returns per-category token identifiers that OneSec can bridge TO from the given source token.
 * - ICP source → { evm: Set<ERC20 address lowercased> } for the given EVM network IDs
 * - EVM source → { icp: Set<ICP ledger canister ID> }
 * - Unknown → undefined (no OneSec restriction applied)
 */
export const oneSecCompatibleDestinations = ({
	sourceToken,
	networkIds
}: {
	sourceToken: AppToken;
	networkIds: NetworkId[];
}): Partial<Record<'icp' | 'evm' | 'sol', Set<string>>> | undefined => {
	if (!ONESEC_SWAP_ENABLED) {
		return;
	}

	if (isIcToken(sourceToken)) {
		const entry = ICP_LEDGER_TO_TOKEN[sourceToken.ledgerCanisterId];
		if (isNullish(entry)) {
			return;
		}

		const addresses = new Set<string>();
		for (const networkId of networkIds) {
			const address = getEvmAddressForNetwork({ config: entry.config, networkId });
			if (nonNullish(address)) {
				addresses.add(address.toLowerCase());
			}
		}

		return addresses.size > 0 ? { evm: addresses } : undefined;
	}

	// EVM source: find OneSec token by matching ERC20 address on the source network
	const srcAddress = (sourceToken as Erc20Token).address;
	if (isNullish(srcAddress)) {
		return;
	}

	for (const [, config] of DEFAULT_CONFIG.tokens) {
		const address = getEvmAddressForNetwork({ config, networkId: sourceToken.network.id });
		if (nonNullish(address) && address.toLowerCase() === srcAddress.toLowerCase()) {
			const ledger = config.ledgerMainnet ?? config.ledger;
			return nonNullish(ledger) ? { icp: new Set([ledger]) } : undefined;
		}
	}
};
