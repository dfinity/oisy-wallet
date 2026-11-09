import {
	MemoryCredentialStorage,
	SessionGoneError,
	SessionIdentity,
	SessionMinter,
	type AppDelegationSource,
	type SessionMinterOptions
} from '@icp-sdk/auth/client';
import type { DerEncodedPublicKey, HttpAgentRequest, Signature } from '@icp-sdk/core/agent';
import { DelegationChain, DelegationIdentity } from '@icp-sdk/core/identity';
import { Principal } from '@icp-sdk/core/principal';
// The standalone SDK package and native host share this public environment file.
// eslint-disable-next-line import/no-relative-parent-imports
import appEnvironment from '../app-environment.json' with { type: 'json' };

const ii = Principal.fromText(appEnvironment.internetIdentityCanisterID);
const hour = 60 * 60 * 1000;
const sameKey = ({ a, b }: { a: Uint8Array; b: Uint8Array }): boolean =>
	a.length === b.length && a.every((byte, index) => byte === b[index]);
const expiry = (chain: DelegationChain): number =>
	Math.min(
		...chain.delegations.map(({ delegation }) => Number(delegation.expiration / 1_000_000n))
	);

// This module consumes a grant already authenticated by the native message gate.
// It is a testable SDK adapter, not a WebKit bridge or an iframe protocol.
class BoundedIdentity extends DelegationIdentity {
	constructor(
		private readonly session: SessionIdentity,
		private readonly assertActive: () => void
	) {
		super(
			{
				sign: async (blob) => {
					assertActive();
					const signature = await session.sign(blob);
					assertActive();
					return signature;
				}
			},
			session.getDelegation()
		);
	}

	override getDelegation(): DelegationChain {
		this.assertActive();
		return this.session.getDelegation();
	}

	override async transformRequest(request: HttpAgentRequest): Promise<unknown> {
		this.assertActive();
		const result = await this.session.transformRequest(request);
		this.assertActive();
		return result;
	}

	override async sign(blob: Uint8Array): Promise<Signature> {
		this.assertActive();
		return await super.sign(blob);
	}
}

export interface SessionGrant {
	chain: DelegationChain;
	expectedAccount: Principal;
	// The original native absolute deadline, not Date.now() + one hour on reload.
	expiresAtMs: number;
}

export type MinterFactory = (options: SessionMinterOptions) => Promise<AppDelegationSource>;

export const isSessionGoneError = (error: unknown): boolean => error instanceof SessionGoneError;

export const prepareWebSession = async ({ onSessionGone }: { onSessionGone?: () => void } = {}) => {
	const storage = new MemoryCredentialStorage();
	const sessionKey = await storage.create();
	const publicKey = sessionKey.getPublicKey().toDer();
	const slot = `oisy-handoff:${crypto.randomUUID()}`;
	let active = true;
	let ended = false;
	let consumed = false;
	let deadline = 0;
	let identity: SessionIdentity | undefined;
	let accepted: SessionGrant | undefined;

	const close = (): void => {
		active = false;
		identity?.dispose();
		void storage.remove(slot);
	};
	const reportGone = (): void => {
		if (!active || ended) {
			return;
		}
		ended = true;
		close();
		onSessionGone?.();
	};
	const assertActive = (): void => {
		if (active && Date.now() >= deadline) {
			reportGone();
		}
		if (!active) {
			if (ended) {
				throw new SessionGoneError('The web session has ended');
			}
			throw new Error('The web session has ended');
		}
	};

	return {
		publicKey: new Uint8Array(publicKey),
		close,
		get isActive(): boolean {
			return active && Date.now() < deadline;
		},
		refresh: async (): Promise<void> => {
			assertActive();
			await identity?.refresh();
			assertActive();
		},
		delegate: async (publicKey: Uint8Array): Promise<string> => {
			assertActive();
			if (
				!accepted ||
				publicKey.length !== 91 ||
				sameKey({ a: publicKey, b: new Uint8Array(sessionKey.getPublicKey().toDer()) })
			) {
				throw new Error('Invalid worker session key');
			}
			// Workers create their own non-exportable P-256 keys. Only the DER public key crosses the port.
			await crypto.subtle.importKey(
				'spki',
				new Uint8Array(publicKey),
				{ name: 'ECDSA', namedCurve: 'P-256' },
				false,
				['verify']
			);
			const chain = await DelegationChain.create(
				sessionKey,
				{ toDer: () => publicKey as DerEncodedPublicKey },
				new Date(deadline),
				{ previous: accepted.chain, targets: [ii] }
			);
			assertActive();
			return JSON.stringify(chain.toJSON());
		},
		accept: async ({
			grant,
			makeMinter = SessionMinter.create
		}: {
			grant: SessionGrant;
			makeMinter?: MinterFactory;
		}): Promise<DelegationIdentity> => {
			if (consumed || !active) {
				throw new Error('The handoff was already consumed or cancelled');
			}
			consumed = true;
			deadline = grant.expiresAtMs;
			try {
				assertActive();
				const { chain } = grant;
				const leaf = chain.delegations.at(-1)?.delegation;
				if (
					!Number.isSafeInteger(deadline) ||
					deadline > Date.now() + hour ||
					chain.delegations.length < 2 ||
					chain.delegations.length > 20 ||
					!leaf ||
					!sameKey({ a: leaf.pubkey, b: publicKey }) ||
					expiry(chain) !== deadline ||
					!leaf.targets ||
					leaf.targets.length !== 1 ||
					leaf.targets[0].compareTo(ii) !== 'eq' ||
					chain.delegations.some(
						({ delegation }) =>
							delegation.permissions !== undefined ||
							(delegation.targets !== undefined &&
								!delegation.targets.some((target) => target.compareTo(ii) === 'eq'))
					)
				) {
					throw new Error('Invalid bounded session handoff');
				}

				const minter = await makeMinter({
					sessionKey,
					sessionChain: chain,
					canisterId: ii,
					agentOptions: { host: appEnvironment.internetComputerHost }
				});
				assertActive();
				const source: AppDelegationSource = {
					mint: async (key) => {
						assertActive();
						const minted = await minter.mint(key);
						assertActive();
						if (minted.delegations.length === 0 || expiry(minted) > deadline) {
							throw new Error('The app delegation exceeds the session deadline');
						}
						return minted;
					}
				};
				const installed = await SessionIdentity.create({
					source,
					storage,
					slot,
					expectedAccount: grant.expectedAccount,
					sessionExpiresAtMs: deadline,
					onSessionGone: reportGone
				});
				identity = installed;
				accepted = grant;
				assertActive();
				return new BoundedIdentity(installed, assertActive);
			} catch (error) {
				if (isSessionGoneError(error)) {
					reportGone();
				}
				close();
				throw error;
			}
		}
	};
};

// Serialize across the compatibility boundary; never depend on SDK class identity across versions.
export const parseSessionGrant = (grant: {
	chain: string;
	principal: string;
	expiresAt: number;
}): SessionGrant => ({
	chain: DelegationChain.fromJSON(grant.chain),
	expectedAccount: Principal.fromText(grant.principal),
	expiresAtMs: grant.expiresAt
});

export { compatibleRequest } from './compatible-request.js';
