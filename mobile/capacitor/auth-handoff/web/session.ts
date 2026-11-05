import {
	MemoryCredentialStorage,
	SessionIdentity,
	SessionMinter,
	type AppDelegationSource,
	type SessionMinterOptions
} from '@icp-sdk/auth/client';
import type { HttpAgentRequest, Signature } from '@icp-sdk/core/agent';
import { DelegationChain, DelegationIdentity } from '@icp-sdk/core/identity';
import { Principal } from '@icp-sdk/core/principal';

const ii = Principal.fromText('rdmx6-jaaaa-aaaaa-aaadq-cai');
const hour = 60 * 60 * 1000;
const sameKey = (a: Uint8Array, b: Uint8Array): boolean =>
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
		return super.sign(blob);
	}
}

export interface SessionGrant {
	chain: DelegationChain;
	expectedAccount: Principal;
	// The original native absolute deadline, not Date.now() + one hour on reload.
	expiresAtMs: number;
}

type MinterFactory = (options: SessionMinterOptions) => Promise<AppDelegationSource>;

export async function prepareWebSession() {
	const storage = new MemoryCredentialStorage();
	const sessionKey = await storage.create();
	const publicKey = sessionKey.getPublicKey().toDer();
	const slot = `oisy-handoff:${crypto.randomUUID()}`;
	let active = true;
	let consumed = false;
	let deadline = 0;
	let identity: SessionIdentity | undefined;

	const close = (): void => {
		active = false;
		identity?.dispose();
		void storage.remove(slot);
	};
	const assertActive = (): void => {
		if (!active || Date.now() >= deadline) {
			close();
			throw new Error('The web session has ended');
		}
	};

	return {
		publicKey: new Uint8Array(publicKey),
		close,
		async accept(
			grant: SessionGrant,
			makeMinter: MinterFactory = SessionMinter.create
		): Promise<DelegationIdentity> {
			if (consumed || !active) throw new Error('The handoff was already consumed or cancelled');
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
					!sameKey(leaf.pubkey, publicKey) ||
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
				)
					throw new Error('Invalid bounded session handoff');

				const minter = await makeMinter({
					sessionKey,
					sessionChain: chain,
					canisterId: ii,
					agentOptions: { host: 'https://icp-api.io' }
				});
				assertActive();
				const source: AppDelegationSource = {
					async mint(key) {
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
					onSessionGone: close
				});
				identity = installed;
				assertActive();
				return new BoundedIdentity(installed, assertActive);
			} catch (error) {
				close();
				throw error;
			}
		}
	};
}
