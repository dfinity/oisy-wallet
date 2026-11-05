import { Actor, HttpAgent } from '@icp-sdk/core/agent';
import { DelegationChain } from '@icp-sdk/core/identity';
import { Principal } from '@icp-sdk/core/principal';
import { prepareWebSession } from './session.js';

interface NativeReply {
	version: number;
	requestID: string;
	chain: Parameters<typeof DelegationChain.fromJSON>[0];
	expectedAccount: string;
	expiresAtMs: number;
}
declare global {
	interface Window {
		webkit: {
			messageHandlers: {
				session: {
					postMessage(body: {
						version: number;
						requestID: string;
						publicKey: string;
					}): Promise<NativeReply>;
				};
			};
		};
	}
}

async function run() {
	const label = document.getElementById('result');
	if (!label) return;
	const receiver = await prepareWebSession();
	window.addEventListener('pagehide', () => receiver.close(), { once: true });
	const requestID = crypto.randomUUID();
	try {
		const reply = await window.webkit.messageHandlers.session.postMessage({
			version: 1,
			requestID,
			publicKey: btoa(String.fromCharCode(...receiver.publicKey))
		});
		if (
			JSON.stringify(reply).length > 65_536 ||
			reply.version !== 1 ||
			reply.requestID.toLowerCase() !== requestID.toLowerCase()
		) {
			throw new Error('Invalid native reply');
		}
		const identity = await receiver.accept({
			chain: DelegationChain.fromJSON(reply.chain),
			expectedAccount: Principal.fromText(reply.expectedAccount),
			expiresAtMs: reply.expiresAtMs
		});
		label.textContent = 'Web app delegation received. Verifying signed ingress…';
		const agent = await HttpAgent.create({ host: 'https://icp-api.io', identity });
		// The same nonfinancial proof canister used by the native SDK's own example.
		// Calling whoami as an update checks ingress authentication, unlike a query.
		const actor = Actor.createActor<{ whoami(): Promise<Principal> }>(
			({ IDL }) => IDL.Service({ whoami: IDL.Func([], [IDL.Principal], []) }),
			{ agent, canisterId: 'ivcos-eqaaa-aaaab-qablq-cai' }
		);
		const reported = await actor.whoami();
		if (reported.compareTo(identity.getPrincipal()) !== 'eq') throw new Error('Account mismatch');
		label.textContent =
			'PASS: native and web accounts match.\nPASS: the network accepted the web delegation and signature.\nReload repeats the handoff within the same session deadline.';
	} catch {
		receiver.close();
		label.textContent =
			'No verified web session. Sign in above; if it still fails, check the callback, SDK session and network.';
	}
}
void run();
