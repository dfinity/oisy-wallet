import { createBtcPrehashSigner, signAndFinalizeBtcPsbt } from '$btc/services/btc-sign.services';
import { buildBtcSendPsbt } from '$btc/utils/btc-psbt.utils';
import * as btcWalletConnectUtils from '$btc/utils/wallet-connect.utils';
import * as signerApi from '$lib/api/signer.api';
import { mockIdentity, mockPrincipal } from '$tests/mocks/identity.mock';
import { assertNonNullish } from '@dfinity/utils';
import { CURVE, getPublicKey, signAsync, Signature } from '@noble/secp256k1';
import { script as btcScript, payments, Transaction, type Psbt } from 'bitcoinjs-lib';

describe('btc-sign.services', () => {
	// Private key 1: its public key is the secp256k1 generator point.
	const privateKey = Uint8Array.from([...Array(31).fill(0), 1]);
	const otherPrivateKey = Uint8Array.from([...Array(31).fill(0), 2]);
	const publicKey = getPublicKey(privateKey);

	const { address: walletAddress } = payments.p2wpkh({ pubkey: Buffer.from(publicKey) });
	assertNonNullish(walletAddress);

	const recipientAddress = 'bc1q44r2nattvp03mvcw986848l3s8squ88477rusl';

	const utxo = ({ txidByte, value }: { txidByte: number; value: bigint }) => ({
		outpoint: { txid: new Uint8Array(32).fill(txidByte), vout: 0 },
		value,
		height: 900_000
	});

	const buildPsbt = (): Psbt =>
		buildBtcSendPsbt({
			utxos: [utxo({ txidByte: 1, value: 20_000n }), utxo({ txidByte: 2, value: 30_000n })],
			outputs: [{ destination: recipientAddress, amount: 10_000n }],
			changeAddress: walletAddress,
			feeSatoshis: 300n,
			network: 'mainnet'
		});

	const signWith =
		({ key, highS = false }: { key: Uint8Array; highS?: boolean }) =>
		async ({ hash }: { hash: Uint8Array }): Promise<Uint8Array> => {
			const signature = await signAsync(hash, key);

			return (
				highS ? new Signature(signature.r, CURVE.n - signature.s) : signature
			).toCompactRawBytes();
		};

	beforeEach(() => {
		vi.clearAllMocks();

		vi.spyOn(btcWalletConnectUtils, 'deriveBtcPublicKey').mockReturnValue(publicKey);
		vi.spyOn(signerApi, 'signBtcPrehash').mockImplementation(signWith({ key: privateKey }));
	});

	describe('createBtcPrehashSigner', () => {
		const hash = new Uint8Array(32).fill(7);

		it('uses the public key derived for the caller', () => {
			const { publicKey: signerPublicKey } = createBtcPrehashSigner({ identity: mockIdentity });

			expect(signerPublicKey).toEqual(Buffer.from(publicKey));
			expect(btcWalletConnectUtils.deriveBtcPublicKey).toHaveBeenCalledExactlyOnceWith({
				principal: mockPrincipal
			});
		});

		it('signs the hash through btc_sign_prehash', async () => {
			const signature = await createBtcPrehashSigner({ identity: mockIdentity }).sign(
				Buffer.from(hash)
			);

			expect(signerApi.signBtcPrehash).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				hash
			});
			expect(signature).toEqual(Buffer.from(await signWith({ key: privateKey })({ hash })));
		});

		it('normalizes a high-S signature to low-S', async () => {
			vi.mocked(signerApi.signBtcPrehash).mockImplementation(
				signWith({ key: privateKey, highS: true })
			);

			const signature = await createBtcPrehashSigner({ identity: mockIdentity }).sign(
				Buffer.from(hash)
			);

			expect(Signature.fromCompact(Uint8Array.from(signature)).hasHighS()).toBeFalsy();
			expect(signature).toEqual(Buffer.from(await signWith({ key: privateKey })({ hash })));
		});
	});

	describe('signAndFinalizeBtcPsbt', () => {
		it('signs every input once and returns the signed transaction', async () => {
			const psbt = buildPsbt();
			const unsignedTxid = Transaction.fromBuffer(psbt.data.getTransaction()).getId();

			const { txid, hex } = await signAndFinalizeBtcPsbt({ psbt, identity: mockIdentity });

			expect(signerApi.signBtcPrehash).toHaveBeenCalledTimes(2);

			const [[first], [second]] = vi.mocked(signerApi.signBtcPrehash).mock.calls;

			expect(first.identity).toBe(mockIdentity);
			expect(second.identity).toBe(mockIdentity);
			expect(first.hash).not.toEqual(second.hash);

			expect(txid).toBe(unsignedTxid);
			expect(Transaction.fromHex(hex).getId()).toBe(txid);
		});

		it('sends a high-S signature from the signer as low-S', async () => {
			vi.mocked(signerApi.signBtcPrehash).mockImplementation(
				signWith({ key: privateKey, highS: true })
			);

			const { hex } = await signAndFinalizeBtcPsbt({ psbt: buildPsbt(), identity: mockIdentity });

			const signatures = Transaction.fromHex(hex).ins.map(
				({ witness }) => btcScript.signature.decode(witness[0]).signature
			);

			expect(signatures).toHaveLength(2);

			signatures.forEach((signature) => {
				expect(Signature.fromCompact(Uint8Array.from(signature)).hasHighS()).toBeFalsy();
			});
		});

		it('throws on a signature made with another key than the input’s', async () => {
			vi.mocked(signerApi.signBtcPrehash).mockImplementation(signWith({ key: otherPrivateKey }));

			await expect(
				signAndFinalizeBtcPsbt({ psbt: buildPsbt(), identity: mockIdentity })
			).rejects.toThrow('does not verify');
		});

		it('throws without signing when the inputs are not the caller’s', async () => {
			vi.mocked(btcWalletConnectUtils.deriveBtcPublicKey).mockReturnValue(
				getPublicKey(otherPrivateKey)
			);

			await expect(
				signAndFinalizeBtcPsbt({ psbt: buildPsbt(), identity: mockIdentity })
			).rejects.toThrow();

			expect(signerApi.signBtcPrehash).not.toHaveBeenCalled();
		});

		it('throws when a signer call fails', async () => {
			const error = new Error('signer unavailable');

			vi.mocked(signerApi.signBtcPrehash).mockRejectedValueOnce(error);

			await expect(
				signAndFinalizeBtcPsbt({ psbt: buildPsbt(), identity: mockIdentity })
			).rejects.toThrow(error);
		});
	});
});
