import { ETHEREUM_NETWORK_ID } from '$env/networks/networks.eth.env';
import { CKBTC_LEDGER_CANISTER_IDS } from '$env/tokens/tokens-icrc/tokens.icrc.ck.btc.env';
import { CKERC20_LEDGER_CANISTER_IDS } from '$env/tokens/tokens-icrc/tokens.icrc.ck.erc20.env';
import { CKETH_LEDGER_CANISTER_IDS } from '$env/tokens/tokens-icrc/tokens.icrc.ck.eth.env';
import { isEthAddress } from '$eth/utils/account.utils';
import type { IcToken } from '$icp/types/ic-token';
import { invalidIcpAddress } from '$icp/utils/account.utils';
import { isTokenIcNft } from '$icp/utils/ic-nft.utils';
import { invalidIcrcAddress } from '$icp/utils/icrc-account.utils';
import { isTokenIcrc } from '$icp/utils/icrc.utils';
import type { CanisterIdText } from '$lib/types/canister';
import type { NetworkId } from '$lib/types/network';
import type { TokenStandard } from '$lib/types/token';
import { isNullishOrEmpty } from '$lib/utils/input.utils';
import { isNetworkIdBitcoin, isNetworkIdEthereum } from '$lib/utils/network.utils';
import { isInvalidDestinationBtc } from '$lib/utils/send.utils';
import { nonNullish } from '@dfinity/utils';

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

const MAX_NAT64 = 18446744073709551615n; // 2n ** 64n - 1n

export const isInvalidNat64Memo = (memo: string): boolean => {
	if (!/^\d+$/.test(memo.trim())) {
		return true;
	}
	try {
		return BigInt(memo.trim()) > MAX_NAT64;
	} catch {
		return true;
	}
};

export const mapIcSendErrorMsg = ({
	err,
	i18n
}: {
	err: unknown;
	i18n: I18n;
}): string => {
	const message = err instanceof Error ? err.message : String(err);

	if (message.includes('Memo size') || message.toLowerCase().includes('memo too long')) {
		return i18n.send.error.memo_too_long;
	}

	return i18n.send.error.unexpected;
};

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
