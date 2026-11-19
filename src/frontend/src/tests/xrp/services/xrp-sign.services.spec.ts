import { XRP_KEY_ID } from '$env/networks/networks.xrp.env';
import * as signerApi from '$lib/api/signer.api';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { mockXrpAddress, mockXrpAddress2 } from '$tests/mocks/xrp.mock';
import { XRP_DERIVATION_PATH_PREFIX } from '$xrp/constants/xrp.constants';
import { getXrpAddressMainnet } from '$xrp/services/xrp-address.services';
import { getXrpSigningPublicKey, signXrpTransaction } from '$xrp/services/xrp-sign.services';
import { XrpNetworks } from '$xrp/types/network';
import { buildXrpPayment } from '$xrp/utils/xrp-transaction.utils';
import { decode, encodeForSigning } from 'ripple-binary-codec';

describe('xrp-sign.services', () => {
	const rawPublicKey = Uint8Array.from(
		Buffer.from('01FA53FA5A7E77798F882ECE20B1ABC00BB358A9E55A202D0D0676BD0CE37A63', 'hex')
	);
	const canonicalPublicKey = 'ED01FA53FA5A7E77798F882ECE20B1ABC00BB358A9E55A202D0D0676BD0CE37A63';
	// The classic address `rawPublicKey` derives to, so it is the account the key may sign for.
	const account = mockXrpAddress;
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
				network: XrpNetworks.mainnet,
				account
			});

			expect(key).toBe(canonicalPublicKey);
		});

		// The key is derived locally while the signature comes from the signer canister, so the two
		// can disagree. Nothing would reject the transaction until XRPL did, on a signature that
		// cannot verify, after the send was submitted — and the same gap would pass a caller asking
		// to send from an account this key cannot sign for.
		it('refuses a key that does not derive the account it will sign for', async () => {
			vi.spyOn(signerApi, 'getSchnorrPublicKey').mockResolvedValue(rawPublicKey);

			await expect(
				getXrpSigningPublicKey({
					identity: mockIdentity,
					network: XrpNetworks.mainnet,
					account: mockXrpAddress2
				})
			).rejects.toThrow(`XRP signing key does not belong to ${mockXrpAddress2}`);
		});

		// The guard must not be satisfiable by a key of the wrong length: the address derivation
		// rejects those, and reaching the `ED`-prefixed string with one would build a
		// `SigningPubKey` XRPL cannot parse.
		it('refuses a key that is not 32 bytes', async () => {
			vi.spyOn(signerApi, 'getSchnorrPublicKey').mockResolvedValue(
				Uint8Array.from(Buffer.alloc(31, 1))
			);

			await expect(
				getXrpSigningPublicKey({ identity: mockIdentity, network: XrpNetworks.mainnet, account })
			).rejects.toThrow('Invalid Ed25519 public key length');
		});

		// The key must come from the SAME path as the account address, and `getXrpPublicKey`
		// prepends the `XRP` prefix itself — so handing it the full path would derive a different
		// key and the transaction would carry a `SigningPubKey` its signature does not match.
		// XRPL would reject that, but only after the send had been signed and submitted.
		it('derives from the account path, unchanged by the shared derivation', async () => {
			const spy = vi.spyOn(signerApi, 'getSchnorrPublicKey').mockResolvedValue(rawPublicKey);

			await getXrpSigningPublicKey({
				identity: mockIdentity,
				network: XrpNetworks.mainnet,
				account
			});

			expect(spy).toHaveBeenCalledWith(
				expect.objectContaining({ derivationPath: ['XRP', XrpNetworks.mainnet] })
			);
		});

		// Same path, same key id, so the signing key and the receive address are the same key.
		it('uses the same derivation as the account address', async () => {
			const spy = vi.spyOn(signerApi, 'getSchnorrPublicKey').mockResolvedValue(rawPublicKey);

			await getXrpAddressMainnet(mockIdentity);

			const [[addressCall]] = spy.mock.calls;

			spy.mockClear();

			await getXrpSigningPublicKey({
				identity: mockIdentity,
				network: XrpNetworks.mainnet,
				account
			});

			const [[signingCall]] = spy.mock.calls;

			expect(signingCall.derivationPath).toEqual(addressCall.derivationPath);
			expect(signingCall.keyId).toEqual(addressCall.keyId);
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
