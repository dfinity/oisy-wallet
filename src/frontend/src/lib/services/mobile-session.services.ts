import { requestMobileWallet } from '$lib/services/mobile-host.services';
import type { HttpAgentRequest, Signature } from '@icp-sdk/core/agent';
import { DelegationChain, DelegationIdentity } from '@icp-sdk/core/identity';
import { compatibleRequest, parseSessionGrant, prepareWebSession } from '@oisy/mobile-session';
import * as z from 'zod';

const hex = z
	.string()
	.min(2)
	.max(48_000)
	.regex(/^(?:[a-f0-9]{2})+$/);
const chainSchema = z
	.object({
		publicKey: hex,
		delegations: z
			.array(
				z
					.object({
						delegation: z
							.object({
								pubkey: hex,
								expiration: z.string().regex(/^[a-f0-9]+$/),
								targets: z.array(hex).max(10).optional(),
								permissions: z.never().optional()
							})
							.strict(),
						signature: hex
					})
					.strict()
			)
			.min(2)
			.max(20)
	})
	.strict();
const grantSchema = z
	.object({
		version: z.literal(1),
		id: z.string().uuid(),
		principal: z.string().min(1).max(100),
		expiresAt: z.number().int().safe().positive(),
		chain: chainSchema
	})
	.strict();

type PreparedSession = Awaited<ReturnType<typeof prepareWebSession>>;
type SDKIdentity = Awaited<ReturnType<PreparedSession['accept']>>;

export class MobileSDKIdentity extends DelegationIdentity {
	constructor(
		private readonly sdk: SDKIdentity,
		private readonly session: PreparedSession,
		readonly sessionExpiresAt: number
	) {
		super(
			{ sign: async (blob) => new Uint8Array(await sdk.sign(blob)) as Signature },
			DelegationChain.fromJSON(JSON.stringify(sdk.getDelegation().toJSON()))
		);
	}
	get isActive(): boolean {
		return this.session.isActive;
	}
	async refresh(): Promise<void> {
		await this.session.refresh();
	}
	override getDelegation(): DelegationChain {
		return DelegationChain.fromJSON(JSON.stringify(this.sdk.getDelegation().toJSON()));
	}
	override async transformRequest(request: HttpAgentRequest): Promise<unknown> {
		return await this.sdk.transformRequest(compatibleRequest(request));
	}
}

export const prepareMobileSession = async (
	options: Parameters<typeof prepareWebSession>[0] = {}
) => {
	const session = await prepareWebSession(options);
	if (import.meta.env.VITE_MOBILE_UI_TEST === 'true') {
		const { uiTestSessionMinter } = await import('$tests/mocks/mobile-sdk-session.fixture');
		const { accept } = session;
		session.accept = ({ grant, makeMinter }) =>
			accept({
				grant,
				makeMinter: makeMinter ?? uiTestSessionMinter(grant)
			});
	}
	return session;
};
export const acceptMobileSession = async ({
	session,
	grant
}: {
	session: PreparedSession;
	grant: { chain: string; principal: string; expiresAt: number };
}) =>
	new MobileSDKIdentity(
		await session.accept({ grant: parseSessionGrant(grant) }),
		session,
		grant.expiresAt
	);

let current:
	{ session: PreparedSession; principal: string; expiresAt: number; grantID: string } | undefined;
export const delegateMobileWorker = async (publicKey: Uint8Array) => {
	const owner = current;
	if (!owner) {
		throw new Error('Mobile session unavailable');
	}
	const chain = await owner.session.delegate(publicKey);
	if (current !== owner) {
		throw new Error('Session changed');
	}
	return { chain, principal: owner.principal, expiresAt: owner.expiresAt };
};
export const mobileSessionMetadata = () => {
	if (!current || !current.session.isActive) {
		throw new Error('Mobile session unavailable');
	}
	return { principal: current.principal, expiresAt: current.expiresAt, grantID: current.grantID };
};

export const createMobileIdentity = async ({
	signal,
	onSessionGone
}: {
	signal?: AbortSignal;
	onSessionGone?: () => void;
} = {}) => {
	const session = await prepareMobileSession({ onSessionGone });
	const close = () => {
		signal?.removeEventListener('abort', close);
		session.close();
		if (current?.session === session) {
			current = undefined;
		}
	};
	if (signal?.aborted) {
		close();
		throw new Error('Session ended');
	}
	signal?.addEventListener('abort', close, { once: true });
	try {
		const raw = await requestMobileWallet({
			method: 'authorize',
			publicKey: Buffer.from(session.publicKey).toString('base64')
		});
		if (raw.length > 65_536) {
			throw new Error('Oversized session grant');
		}
		const grant = grantSchema.parse(JSON.parse(raw));
		const identity = await acceptMobileSession({
			session,
			grant: {
				chain: JSON.stringify(grant.chain),
				principal: grant.principal,
				expiresAt: grant.expiresAt
			}
		});
		current = {
			session,
			principal: grant.principal,
			expiresAt: grant.expiresAt,
			grantID: grant.id
		};
		return { identity, grantID: grant.id, expiresAt: grant.expiresAt, close };
	} catch (error) {
		close();
		throw error;
	}
};
