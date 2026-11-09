import { DelegationChain, Ed25519KeyIdentity } from '@icp-sdk/core/identity';
import { parseSessionGrant, type MinterFactory, type SessionGrant } from '@oisy/mobile-session';

// Public deterministic test key. Imported only by VITE_MOBILE_UI_TEST builds.
const account = Ed25519KeyIdentity.generate(new Uint8Array(32).fill(7));
export const uiTestSessionMinter = (grant: SessionGrant): MinterFactory | undefined => {
	if (grant.expectedAccount.toText() !== account.getPrincipal().toText()) {
		return;
	}
	return () =>
		Promise.resolve({
			mint: async (key) => {
				const chain = await DelegationChain.create(
					account,
					{ toDer: () => key },
					new Date(Math.min(grant.expiresAtMs, Date.now() + 300_000))
				);
				return parseSessionGrant({
					chain: JSON.stringify(chain.toJSON()),
					principal: account.getPrincipal().toText(),
					expiresAt: grant.expiresAtMs
				}).chain;
			}
		});
};
