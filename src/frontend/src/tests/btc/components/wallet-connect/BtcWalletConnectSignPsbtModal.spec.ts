import BtcWalletConnectSignPsbtModal from '$btc/components/wallet-connect/BtcWalletConnectSignPsbtModal.svelte';
import * as btcWalletConnectServices from '$btc/services/wallet-connect.services';
import { BIP122_CHAINS } from '$env/bip122-chains.env';
import { BTC_MAINNET_NETWORK_ID } from '$env/networks/networks.btc.env';
import { txidStringToUint8Array } from '$icp/utils/btc.utils';
import en from '$tests/mocks/i18n.mock';
import { assertNonNullish } from '@dfinity/utils';
import type { BitcoinDid } from '@icp-sdk/canisters/ckbtc';
import type { WalletKitTypes } from '@reown/walletkit';
import { render, waitFor } from '@testing-library/svelte';
import { networks, payments, Psbt } from 'bitcoinjs-lib';

describe('BtcWalletConnectSignPsbtModal', () => {
	const TXID = '0000000000000000000000000000000000000000000000000000000000000001';

	const mainnetChainId = Object.keys(BIP122_CHAINS).find(
		(key) => BIP122_CHAINS[key].networkId === BTC_MAINNET_NETWORK_ID
	);
	assertNonNullish(mainnetChainId);

	const { address, output: walletScript } = payments.p2wpkh({
		pubkey: Buffer.from(
			'0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798',
			'hex'
		),
		network: networks.bitcoin
	});

	const buildRequest = (): WalletKitTypes.SessionRequest => {
		const psbt = new Psbt({ network: networks.bitcoin });
		psbt.addInput({
			hash: TXID,
			index: 0,
			witnessUtxo: { script: walletScript as Buffer, value: 100_000 }
		});
		psbt.addOutput({ script: walletScript as Buffer, value: 90_000 });

		return {
			id: 1,
			topic: 'mock-topic',
			params: {
				chainId: mainnetChainId,
				request: { method: 'signPsbt', params: { psbt: psbt.toBase64(), broadcast: false } }
			},
			verifyContext: {
				verified: {
					verifyUrl: 'https://verify.walletconnect.org',
					validation: 'VALID',
					origin: 'https://dapp.example',
					isScam: false
				}
			}
		} as unknown as WalletKitTypes.SessionRequest;
	};

	const walletUtxo: BitcoinDid.utxo = {
		outpoint: { txid: txidStringToUint8Array(TXID), vout: 0 },
		value: 100_000n,
		height: 1
	};

	const props = () => ({ listener: undefined, request: buildRequest(), address });

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('shows a spinner until the wallet UTXOs are loaded, then the request', async () => {
		let resolveUtxos: (utxos: BitcoinDid.utxo[]) => void = () => {};

		vi.spyOn(btcWalletConnectServices, 'loadPsbtWalletUtxos').mockReturnValue(
			new Promise((resolve) => {
				resolveUtxos = resolve;
			})
		);

		const { getByRole, getByTestId, queryByTestId } = render(BtcWalletConnectSignPsbtModal, {
			props: props()
		});

		expect(getByTestId('btc-wallet-connect-sign-psbt-loading')).toBeInTheDocument();

		resolveUtxos([walletUtxo]);

		await waitFor(() =>
			expect(queryByTestId('btc-wallet-connect-sign-psbt-loading')).not.toBeInTheDocument()
		);

		expect(getByRole('button', { name: en.core.text.approve })).toBeInTheDocument();
	});

	it('refuses an input of the wallet missing from its UTXO set', async () => {
		vi.spyOn(btcWalletConnectServices, 'loadPsbtWalletUtxos').mockResolvedValue([]);

		const { findByText, queryByRole } = render(BtcWalletConnectSignPsbtModal, {
			props: props()
		});

		await expect(findByText(en.wallet_connect.error.btc_psbt_input_unverified)).resolves.toBeInTheDocument();
		expect(queryByRole('button', { name: en.core.text.approve })).not.toBeInTheDocument();
	});

	it('refuses an input of the wallet when its UTXO set cannot be loaded', async () => {
		vi.spyOn(btcWalletConnectServices, 'loadPsbtWalletUtxos').mockRejectedValue(
			new Error('unavailable')
		);

		const { findByText, queryByRole } = render(BtcWalletConnectSignPsbtModal, {
			props: props()
		});

		await expect(findByText(en.wallet_connect.error.btc_psbt_input_unverified)).resolves.toBeInTheDocument();
		expect(queryByRole('button', { name: en.core.text.approve })).not.toBeInTheDocument();
	});
});
