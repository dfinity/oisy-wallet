import { XRP_KEY_ID } from '$env/networks/networks.xrp.env';
import * as signerApi from '$lib/api/signer.api';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { XRP_DERIVATION_PATH_PREFIX } from '$xrp/constants/xrp.constants';
import { getXrpSigningPublicKey, signXrpTransaction } from '$xrp/services/xrp-sign.services';
import { XrpNetworks } from '$xrp/types/network';
import { buildXrpPayment } from '$xrp/utils/xrp-transaction.utils';
import { decode, encodeForSigning } from 'ripple-binary-codec';

describe('xrp-sign.services', () => {
	const rawPublicKey = Uint8Array.from(
		Buffer.from('01FA53FA5A7E77798F882ECE20B1ABC00BB358A9E55A202D0D0676BD0CE37A63', 'hex')
	);
	const canonicalPublicKey = 'ED01FA53FA5A7E77798F882ECE20B1ABC00BB358A9E55A202D0D0676BD0CE37A63';
	// A stand-in 64-byte Ed25519 signature (the real one comes from the threshold signer).
	const signature = Uint8Array.from(Buffer.alloc(64, 7));

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('getXrpSigningPublicKey', () => {
		it('returns the ED-prefixed uppercase canonical public key', async () => {
			vi.spyOn(signerApi, 'getSchnorrPublicKey').mockResolvedValue(rawPublicKey);

			const key = await getXrpSigningPublicKey({
				identity: mockIdentity,
				network: XrpNetworks.mainnet
			});

			expect(key).toBe(canonicalPublicKey);
		});
	});

	describe('signXrpTransaction', () => {
		const transaction = buildXrpPayment({
			account: 'rLUEXYuLiQptky37CqLcm9USQpPiz5rkpD',
			destination: 'rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe',
			amount: 25_000_000n,
			fee: 12n,
			sequence: 1,
			signingPublicKey: canonicalPublicKey,
			destinationTag: 12345
		});

		it('signs the exact encodeForSigning bytes with the XRP key and path', async () => {
			const spy = vi.spyOn(signerApi, 'signWithSchnorr').mockResolvedValue(signature);

			await signXrpTransaction({
				identity: mockIdentity,
				network: XrpNetworks.mainnet,
				transaction
			});

			expect(spy).toHaveBeenCalledWith({
				identity: mockIdentity,
				derivationPath: [XRP_DERIVATION_PATH_PREFIX, XrpNetworks.mainnet],
				keyId: XRP_KEY_ID,
				message: Uint8Array.from(Buffer.from(encodeForSigning(transaction), 'hex'))
			});
		});

		it('returns a tx_blob that decodes back with the signature and fields intact', async () => {
			vi.spyOn(signerApi, 'signWithSchnorr').mockResolvedValue(signature);

			const blob = await signXrpTransaction({
				identity: mockIdentity,
				network: XrpNetworks.mainnet,
				transaction
			});

			const decoded = decode(blob);

			expect(decoded.TxnSignature).toBe(Buffer.from(signature).toString('hex').toUpperCase());
			expect(decoded.Amount).toBe('25000000');
			expect(decoded.DestinationTag).toBe(12345);
			expect(decoded.SigningPubKey).toBe(canonicalPublicKey);
		});
	});
});
