import { decodePsbt } from '$btc/services/wallet-connect.services';
import { BIP122_CHAINS } from '$env/bip122-chains.env';
import { BTC_TESTNET_NETWORK_ID } from '$env/networks/networks.btc.env';
import { ZERO } from '$lib/constants/app.constants';
import type { WalletKitTypes } from '@reown/walletkit';
import { networks, payments, Psbt } from 'bitcoinjs-lib';

describe('btc wallet-connect.services', () => {
	const network = networks.testnet;

	// Deterministic compressed secp256k1 public key (generator point G) — only used to derive a valid
	// P2WPKH address/script for the test fixtures; no signing happens here.
	const pubkey = Buffer.from(
		'0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798',
		'hex'
	);

	const { address: walletAddress, output: walletScript } = payments.p2wpkh({ pubkey, network });

	const externalScript = payments.p2wpkh({
		pubkey: Buffer.from(
			'03d01115d548e7561b15c38f004d734633687cf4419620095bc5b0f47070afe85a',
			'hex'
		),
		network
	}).output;

	const testnetChainId = Object.keys(BIP122_CHAINS).find(
		(key) => BIP122_CHAINS[key].networkId === BTC_TESTNET_NETWORK_ID
	);

	const buildPsbt = (): string => {
		const psbt = new Psbt({ network });

		psbt.addInput({
			hash: '0000000000000000000000000000000000000000000000000000000000000001',
			index: 0,
			witnessUtxo: { script: walletScript as Buffer, value: 100_000 }
		});

		// External recipient
		psbt.addOutput({ script: externalScript as Buffer, value: 70_000 });
		// Change back to the wallet
		psbt.addOutput({ script: walletScript as Buffer, value: 28_000 });

		return psbt.toBase64();
	};

	const buildRequest = (params: Record<string, unknown>): WalletKitTypes.SessionRequest =>
		({
			params: {
				chainId: testnetChainId,
				request: { method: 'signPsbt', params }
			}
		}) as unknown as WalletKitTypes.SessionRequest;

	it('decodes inputs, outputs, total spend and fee', () => {
		const request = buildRequest({ psbt: buildPsbt(), broadcast: false });

		const decoded = decodePsbt({ request, address: walletAddress });

		expect(decoded.inputs).toHaveLength(1);
		expect(decoded.inputs[0].address).toBe(walletAddress);
		expect(decoded.inputs[0].value).toBe(100_000n);
		expect(decoded.inputs[0].signedByWallet).toBeTruthy();

		expect(decoded.outputs).toHaveLength(2);
		expect(decoded.outputs[0].value).toBe(70_000n);
		expect(decoded.outputs[1].value).toBe(28_000n);

		expect(decoded.totalSpend).toBe(100_000n);
		// 100_000 - (70_000 + 28_000)
		expect(decoded.fee).toBe(2_000n);
		expect(decoded.broadcast).toBeFalsy();
	});

	it('flags an input as not owned when it does not match the wallet address', () => {
		const request = buildRequest({ psbt: buildPsbt(), broadcast: false });

		const decoded = decodePsbt({ request, address: 'tb1qsomeoneelseaddressxxxxxxxxxxxxxxxxxxxx' });

		expect(decoded.inputs[0].signedByWallet).toBeFalsy();
		expect(decoded.totalSpend).toBe(ZERO);
	});

	it('reports the broadcast flag and defaults it to false', () => {
		const request = buildRequest({ psbt: buildPsbt() });

		expect(decodePsbt({ request, address: walletAddress }).broadcast).toBeFalsy();

		const broadcastRequest = buildRequest({ psbt: buildPsbt(), broadcast: true });

		expect(
			decodePsbt({ request: broadcastRequest, address: walletAddress }).broadcast
		).toBeTruthy();
	});

	it('throws when the PSBT is missing', () => {
		const request = buildRequest({ broadcast: false });

		expect(() => decodePsbt({ request, address: walletAddress })).toThrow();
	});

	it('throws when the PSBT cannot be parsed', () => {
		const request = buildRequest({ psbt: 'not-a-valid-psbt', broadcast: false });

		expect(() => decodePsbt({ request, address: walletAddress })).toThrow();
	});
});
