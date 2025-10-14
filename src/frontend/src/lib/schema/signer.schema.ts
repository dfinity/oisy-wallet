import * as z from 'zod';

const SignerPubKeySchema = z.object({
	pubkey: z.string().min(66).max(66)
});

const SignerMasterPubKeySchema = z.object({
	ecdsa: z.object({
		secp256k1: SignerPubKeySchema
	}),
	schnorr: z.object({
		ed25519: SignerPubKeySchema
	})
});

export const SignerMasterPubKeysSchema = z.object({
	key_1: SignerMasterPubKeySchema,
	test_key_1: SignerMasterPubKeySchema,
	dfx_test_key: SignerMasterPubKeySchema.optional()
});
