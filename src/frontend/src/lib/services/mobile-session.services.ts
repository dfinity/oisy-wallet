import { requestMobileWallet } from '$lib/services/mobile-host.services';
import {
	DelegationChain,
	DelegationIdentity,
	Ed25519KeyIdentity,
	isDelegationValid
} from '@icp-sdk/core/identity';
import * as z from 'zod';

const bytes = z
	.string()
	.min(1)
	.max(24_000)
	.regex(/^[A-Za-z0-9+/]+={0,2}$/);
const grantSchema = z
	.object({
		id: z.string().uuid(),
		principal: z.string(),
		expiresAt: z.number().finite(),
		chain: z
			.object({
				publicKey: bytes,
				signerDelegation: z
					.array(
						z
							.object({
								delegation: z
									.object({
										pubkey: bytes,
										expiration: z.string().regex(/^\d+$/),
										targets: z.null().optional(),
										permissions: z.null().optional()
									})
									.strict(),
								signature: bytes
							})
							.strict()
					)
					.min(2)
					.max(21)
			})
			.strict()
	})
	.strict();

export const createMobileIdentity = async () => {
	const key = Ed25519KeyIdentity.generate();
	const publicKey = key.getPublicKey().toDer();
	const raw = await requestMobileWallet({
		method: 'authorize',
		publicKey: Buffer.from(publicKey).toString('base64')
	});
	if (raw.length > 65_536) {
		throw new Error('Oversized delegation');
	}
	const grant = grantSchema.parse(JSON.parse(raw));
	const hex = (value: string) => Buffer.from(value, 'base64').toString('hex');
	const delegations = grant.chain.signerDelegation.map(({ delegation, signature }) => ({
		delegation: {
			pubkey: hex(delegation.pubkey),
			expiration: BigInt(delegation.expiration).toString(16)
		},
		signature: hex(signature)
	}));
	const chain = DelegationChain.fromJSON(
		JSON.stringify({ publicKey: hex(grant.chain.publicKey), delegations })
	);
	if (
		!isDelegationValid(chain) ||
		delegations.at(-1)?.delegation.pubkey !== Buffer.from(publicKey).toString('hex') ||
		grant.expiresAt <= Date.now() ||
		grant.expiresAt > Date.now() + 301_000 ||
		grant.expiresAt >
			Math.min(
				...chain.delegations.map(({ delegation }) => Number(delegation.expiration) / 1_000_000)
			) +
				1
	) {
		throw new Error('Invalid mobile delegation');
	}
	const identity = DelegationIdentity.fromDelegation(key, chain);
	if (identity.getPrincipal().toText() !== grant.principal) {
		throw new Error('Mobile account mismatch');
	}
	return { identity, grantID: grant.id, expiresAt: grant.expiresAt };
};
