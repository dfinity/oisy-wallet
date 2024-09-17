import type { BitcoinNetwork as SignerBitcoinNetwork } from '$declarations/signer/signer.did';
import type { BitcoinNetwork } from '@dfinity/ckbtc';

export const mapToSignerBitcoinNetwork = ({
	network
}: {
	network: BitcoinNetwork;
}): SignerBitcoinNetwork =>
	({ mainnet: { mainnet: null }, testnet: { testnet: null }, regtest: { regtest: null } })[network];
