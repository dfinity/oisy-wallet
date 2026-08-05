import type { BtcAddress } from '$btc/types/address';
import { SUPPORTED_EVM_NETWORKS } from '$env/networks/networks-evm/networks.evm.env';
import { SUPPORTED_ETHEREUM_NETWORKS } from '$env/networks/networks.eth.env';
import type { EthAddress } from '$eth/types/address';
import type { Erc20Token } from '$eth/types/erc20';
import type { Erc4626Token } from '$eth/types/erc4626';
import type { EthereumNetwork } from '$eth/types/network';
import { isTokenErc20 } from '$eth/utils/erc20.utils';
import { isTokenErc4626 } from '$eth/utils/erc4626.utils';
import type { IcToken } from '$icp/types/ic-token';
import { isTokenIcp, isTokenIcrc } from '$icp/utils/icrc.utils';
import { ZERO } from '$lib/constants/app.constants';
import {
	PLUG_EVM_PATH_DISCRIMINATOR,
	PLUG_HELPER_CANISTER_ID,
	PLUG_IC_DERIVATION_PATH_PREFIX,
	PLUG_ZERO_CHAIN_CODE
} from '$lib/constants/plug.constants';
import { SIGNER_MASTER_PUB_KEYS } from '$lib/constants/signer.constants';
import type { NetworkId } from '$lib/types/network';
import type { PlugAccount, PlugBalance } from '$lib/types/plug';
import type { Token } from '$lib/types/token';
import { isNetworkIdEthereum, isNetworkIdEvm, isNetworkIdSolana } from '$lib/utils/network.utils';
import type { SolAddress } from '$sol/types/address';
import { isTokenSpl } from '$sol/utils/spl.utils';
import { secp256k1 } from '@dfinity/ic-pub-key/ecdsa';
import { bip340secp256k1, ed25519 } from '@dfinity/ic-pub-key/schnorr';
import { isNullish, nonNullish } from '@dfinity/utils';
import { Secp256k1KeyIdentity } from '@icp-sdk/core/identity/secp256k1';
import { Principal } from '@icp-sdk/core/principal';
import { HDKey } from '@scure/bip32';
import { mnemonicToSeedSync, validateMnemonic } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english';
import { getAddressDecoder } from '@solana/kit';
import { address as btcAddress, networks } from 'bitcoinjs-lib';
import { computeAddress } from 'ethers/transaction';

// Plug is a mainnet-only product, so reproducing the addresses it shows always
// means deriving against the mainnet master keys — never the environment's
// signer key, which would silently yield addresses that hold nothing.
const MAINNET_MASTER_KEYS = SIGNER_MASTER_PUB_KEYS.key_1;

const helperCanisterBytes = (): Uint8Array =>
	Uint8Array.from(Principal.fromText(PLUG_HELPER_CANISTER_ID).toUint8Array());

const chainKeyPath = ({
	principal,
	discriminator
}: {
	principal: string;
	discriminator?: number;
}): secp256k1.DerivationPath => {
	const principalBytes = Uint8Array.from(Principal.fromText(principal).toUint8Array());

	return new secp256k1.DerivationPath([
		helperCanisterBytes(),
		...(discriminator === undefined ? [] : [Uint8Array.from([discriminator])]),
		principalBytes
	]);
};

const normalizePhrase = (phrase: string): string => phrase.trim().replace(/\s+/g, ' ');

export const isValidPlugSeedPhrase = (phrase: string): boolean =>
	validateMnemonic(normalizePhrase(phrase), wordlist);

/**
 * The only key the seed phrase actually controls. Everything else Plug shows is
 * a threshold key derived from the resulting principal.
 */
export const derivePlugIdentity = ({
	phrase,
	index
}: {
	phrase: string;
	index: number;
}): Secp256k1KeyIdentity => {
	const normalized = normalizePhrase(phrase);

	if (!validateMnemonic(normalized, wordlist)) {
		throw new Error('Invalid Plug seed phrase');
	}

	const { privateKey } = HDKey.fromMasterSeed(mnemonicToSeedSync(normalized)).derive(
		`${PLUG_IC_DERIVATION_PATH_PREFIX}/${index}`
	);

	if (isNullish(privateKey)) {
		throw new Error(`Unable to derive a Plug private key at account index ${index}`);
	}

	return Secp256k1KeyIdentity.fromSecretKey(privateKey);
};

export const derivePlugEvmAddress = (principal: string): EthAddress => {
	const derived = secp256k1.PublicKeyWithChainCode.fromString({
		public_key: MAINNET_MASTER_KEYS.ecdsa.secp256k1.pubkey,
		chain_code: PLUG_ZERO_CHAIN_CODE
	}).deriveSubkeyWithChainCode(
		chainKeyPath({ principal, discriminator: PLUG_EVM_PATH_DISCRIMINATOR })
	);

	return computeAddress(`0x${derived.public_key.toHex()}`);
};

/**
 * Plug's Bitcoin address is a P2TR output whose output key is the derived
 * BIP340 key used **directly** — no BIP341 tweak. Its canister method is named
 * `btc_p2tr_raw_key_address` for exactly that reason.
 */
export const derivePlugBtcAddress = (principal: string): BtcAddress => {
	const derived = bip340secp256k1.PublicKeyWithChainCode.fromString({
		public_key: MAINNET_MASTER_KEYS.schnorr.bip340secp256k1.pubkey,
		chain_code: PLUG_ZERO_CHAIN_CODE
	}).deriveSubkeyWithChainCode(chainKeyPath({ principal }));

	const xOnlyPublicKey = Buffer.from(derived.public_key.toHex().slice(2), 'hex');

	return btcAddress.toBech32(xOnlyPublicKey, 1, networks.bitcoin.bech32);
};

export const derivePlugSolAddress = (principal: string): SolAddress => {
	const { response } = ed25519.schnorrEd25519Derive(
		MAINNET_MASTER_KEYS.schnorr.ed25519.pubkey,
		PLUG_ZERO_CHAIN_CODE,
		chainKeyPath({ principal }).toBlob()
	);

	return getAddressDecoder().decode(
		Uint8Array.from(Buffer.from(response.public_key.toHex(), 'hex'))
	);
};

export const derivePlugAccount = ({
	phrase,
	index
}: {
	phrase: string;
	index: number;
}): PlugAccount => {
	const principal = derivePlugIdentity({ phrase, index }).getPrincipal().toText();

	return {
		index,
		principal,
		evmAddress: derivePlugEvmAddress(principal),
		btcAddress: derivePlugBtcAddress(principal),
		solAddress: derivePlugSolAddress(principal)
	};
};

export const derivePlugAccounts = ({
	phrase,
	depth
}: {
	phrase: string;
	depth: number;
}): PlugAccount[] =>
	Array.from({ length: depth }, (_, index) => derivePlugAccount({ phrase, index }));

/**
 * How much of a balance can actually be moved.
 *
 * Only ICP and ICRC tokens can be swept: their transfer is signed locally with
 * the identity the seed phrase controls. Everything else on the page is a
 * threshold key held by another canister, so it is display-only.
 *
 * The fee is deducted from the same token, so a balance that cannot cover its
 * own fee is not sweepable at all — returning `undefined` here is what lets the
 * UI disable that row with a reason instead of offering an action that can only
 * fail.
 */
export const isPlugSweepableToken = (token: Token): token is IcToken =>
	isTokenIcp(token) || isTokenIcrc(token);

export const plugSweepableAmount = ({
	token,
	balance
}: {
	token: Token;
	balance: bigint | undefined;
}): bigint | undefined => {
	if (isNullish(balance) || !isPlugSweepableToken(token)) {
		return undefined;
	}

	const { fee } = token;

	return balance > fee ? balance - fee : undefined;
};

/**
 * An EVM token moved by a contract call rather than as the chain's native coin.
 *
 * ERC-4626 vault shares are a superset of ERC-20 — they implement `balanceOf` and
 * `transfer` — so a vault is read and sent exactly like any ERC-20, on its own
 * contract address. Treating them together is what stops a vault row from falling
 * through to the native-balance branch and reporting the account's ETH instead.
 */
export const isPlugEvmContractToken = (token: Token): token is Erc20Token | Erc4626Token =>
	isTokenErc20(token) || isTokenErc4626(token);

/**
 * A token whose network fee is paid in a *separate* native coin — ERC-20/ERC-4626
 * (gas in ETH) and SPL (fee in SOL). Moving one is impossible without that coin in
 * the same account, which is what distinguishes it from a native coin that pays
 * its own fee. Used to gate the send action and to find the native row.
 */
export const isPlugGasToken = (token: Token): boolean =>
	isPlugEvmContractToken(token) || isTokenSpl(token);

/**
 * A chain where the fee is paid from a native balance in the account, so a token
 * needs that coin present and a native send must reserve it. Both EVM and Solana
 * work this way; IC ledgers charge the fee in the token itself.
 */
export const isPlugFeeChain = (networkId: NetworkId): boolean =>
	isNetworkIdEthereum(networkId) || isNetworkIdEvm(networkId) || isNetworkIdSolana(networkId);

/**
 * Identifies a balance row.
 *
 * Symbol alone is not unique and neither is the address: the same token can be
 * enabled on several EVM networks, where every row shares both the symbol and the
 * derived address. Only the network disambiguates them.
 */
export const plugRowKey = ({ token: { symbol, network } }: PlugBalance): string =>
	`${network.id.toString()}-${symbol}`;

const plugNativeBalance = ({
	networkId,
	balances
}: {
	networkId: NetworkId;
	balances: PlugBalance[];
}): bigint | undefined =>
	balances.find(({ token }) => token.network.id === networkId && !isPlugGasToken(token))?.balance;

/**
 * Whether a fee-chain (EVM / Solana) row can be moved.
 *
 * The fee is paid in the network's native coin out of the imported account, so a
 * token transfer is impossible without that coin sitting there — a common state
 * for someone who only ever received tokens. The exact fee needs live data, so
 * this is the cheap gate that keeps an impossible action off the screen; the send
 * path re-checks against the real fee.
 */
export const isPlugFeeChainSendable = ({
	token,
	balance,
	balances
}: {
	token: Token;
	balance: bigint | undefined;
	balances: PlugBalance[];
}): boolean => {
	if (isNullish(balance) || balance <= ZERO) {
		return false;
	}

	if (!isPlugGasToken(token)) {
		return true;
	}

	const native = plugNativeBalance({ networkId: token.network.id, balances });

	return nonNullish(native) && native > ZERO;
};

/**
 * The EVM network for a network id, typed so callers get `chainId` without a cast.
 */
export const plugEvmNetwork = (networkId: NetworkId): EthereumNetwork | undefined =>
	[...SUPPORTED_ETHEREUM_NETWORKS, ...SUPPORTED_EVM_NETWORKS].find(({ id }) => id === networkId);
