import { ETHEREUM_NETWORK_ID } from '$env/networks/networks.eth.env';
import { ICP_LEDGER_CANISTER_ID } from '$env/networks/networks.icp.env';
import { CKBTC_LEDGER_CANISTER_IDS } from '$env/tokens/tokens-icrc/tokens.icrc.ck.btc.env';
import { CKERC20_LEDGER_CANISTER_IDS } from '$env/tokens/tokens-icrc/tokens.icrc.ck.erc20.env';
import { CKETH_LEDGER_CANISTER_IDS } from '$env/tokens/tokens-icrc/tokens.icrc.ck.eth.env';
import { isEthAddress } from '$eth/utils/account.utils';
import type { IcToken } from '$icp/types/ic-token';
import { invalidIcpAddress } from '$icp/utils/account.utils';
import { isTokenIcNft } from '$icp/utils/ic-nft.utils';
import { tryToParseIcrcAccountStringToAccountIdentifierText } from '$icp/utils/icp-account.utils';
import { invalidIcrcAddress } from '$icp/utils/icrc-account.utils';
import { isTokenIcp, isTokenIcrc } from '$icp/utils/icrc.utils';
import type { CanisterIdText } from '$lib/types/canister';
import type { NetworkId } from '$lib/types/network';
import type { OptionToken, TokenStandard } from '$lib/types/token';
import { isNullishOrEmpty } from '$lib/utils/input.utils';
import { isNetworkIdBitcoin, isNetworkIdEthereum, isNetworkIdICP } from '$lib/utils/network.utils';
import { isInvalidDestinationBtc } from '$lib/utils/send.utils';
import { nonNullish } from '@dfinity/utils';
import { encodeIcrcAccount } from '@icp-sdk/canisters/ledger/icrc';

const isTokenLedger = ({
	token: { ledgerCanisterId },
	ledgerCanisterIds
}: {
	token: Partial<IcToken>;
	ledgerCanisterIds: CanisterIdText[];
}): boolean => nonNullish(ledgerCanisterId) && ledgerCanisterIds.includes(ledgerCanisterId);

export const isTokenCkBtcLedger = (token: Partial<IcToken>): boolean =>
	isTokenLedger({ token, ledgerCanisterIds: CKBTC_LEDGER_CANISTER_IDS });

export const isTokenCkEthLedger = (token: Partial<IcToken>): boolean =>
	isTokenLedger({ token, ledgerCanisterIds: CKETH_LEDGER_CANISTER_IDS });

export const isTokenCkErc20Ledger = (token: Partial<IcToken>): boolean =>
	isTokenLedger({ token, ledgerCanisterIds: CKERC20_LEDGER_CANISTER_IDS });

export const isNetworkIdETHMainnet = (networkId: NetworkId | undefined): boolean =>
	ETHEREUM_NETWORK_ID === networkId;

export const isNetworkIdETH = (networkId: NetworkId | undefined): boolean =>
	nonNullish(networkId) && isNetworkIdEthereum(networkId);

export const isInvalidDestinationIc = ({
	destination,
	tokenStandard,
	networkId
}: {
	destination: string;
	tokenStandard: TokenStandard;
	networkId?: NetworkId;
}): boolean => {
	if (isNullishOrEmpty(destination)) {
		return false;
	}

	if (isNetworkIdBitcoin(networkId)) {
		return isInvalidDestinationBtc({ destination, networkId });
	}

	if (nonNullish(networkId) && isNetworkIdEthereum(networkId)) {
		return !isEthAddress(destination);
	}

	if (isTokenIcrc({ standard: tokenStandard }) || isTokenIcNft({ standard: tokenStandard })) {
		return invalidIcrcAddress(destination);
	}

	return invalidIcpAddress(destination) && invalidIcrcAddress(destination);
};

// The first mobile Send slice uses the existing ICP ledger flow. A ticker or
// ICRC standard alone must not opt a custom token into this rollout.
export const isMobileSendToken = (token: OptionToken): token is IcToken =>
	nonNullish(token) &&
	isNetworkIdICP(token.network.id) &&
	((isTokenIcp(token) && token.ledgerCanisterId === ICP_LEDGER_CANISTER_ID) ||
		(isTokenIcrc(token) &&
			(isTokenCkBtcLedger(token) || isTokenCkEthLedger(token) || isTokenCkErc20Ledger(token))));

export const isMobileSendDestination = ({
	token,
	destination
}: {
	token: OptionToken;
	destination: string;
}): boolean => {
	if (
		!isMobileSendToken(token) ||
		!destination ||
		isInvalidDestinationIc({ destination, tokenStandard: token.standard })
	) {
		return false;
	}
	// Compare account identities, including ICP's legacy hex representation and
	// equivalent ICRC zero-subaccount encodings. Mint/burn is a separate flow.
	const { mintingAccount } = token;
	if (!mintingAccount) {
		return true;
	}
	const mintingAddress = tryToParseIcrcAccountStringToAccountIdentifierText(
		encodeIcrcAccount(mintingAccount)
	);
	const address =
		tryToParseIcrcAccountStringToAccountIdentifierText(destination) ?? destination.toLowerCase();
	return address !== mintingAddress;
};
