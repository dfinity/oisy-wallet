import { AuthClientProvider } from '$lib/providers/auth-client.providers';
import {
	acceptMobileSession,
	delegateMobileWorker,
	mobileSessionMetadata,
	prepareMobileSession
} from '$lib/services/mobile-session.services';
import * as z from 'zod';

const requestSchema = z.object({ publicKey: z.string().regex(/^[a-f0-9]{182}$/) }).strict();
const responseSchema = z
	.object({
		generation: z.string().uuid(),
		chain: z.string().max(65_536)
	})
	.strict();
const readySchema = z.object({ generation: z.string().uuid(), ready: z.literal(true) }).strict();
export const mobileWorkerInitSchema = z
	.object({
		msg: z.literal('mobileSession'),
		generation: z.string().uuid(),
		principal: z.string().min(1).max(100),
		expiresAt: z.number().finite()
	})
	.strict();

const endedSchema = z
	.object({ msg: z.literal('mobileSessionEnded'), generation: z.string().uuid() })
	.strict();
const HANDSHAKE_TIMEOUT = 15_000;

// A new worker owns its key. Only public keys and signed delegations cross its dedicated port.
export const connectMobileWorkerSession = async ({
	worker,
	onSessionGone
}: {
	worker: Pick<Worker, 'postMessage' | 'addEventListener' | 'removeEventListener'>;
	onSessionGone: () => void;
}): Promise<void> => {
	const provider = AuthClientProvider.getInstance();
	const identity = await provider.loadIdentity();
	if (!identity) {
		throw new Error('Mobile session unavailable');
	}
	const metadata = mobileSessionMetadata();
	const generation = crypto.randomUUID();
	const deadline = metadata.expiresAt;
	const channel = new MessageChannel();
	let connected = false;
	let terminal = false;
	const ended = ({ data }: MessageEvent<unknown>): void => {
		const parsed = endedSchema.safeParse(data);
		if (!parsed.success || parsed.data.generation !== generation || terminal) {
			return;
		}
		try {
			const latest = mobileSessionMetadata();
			if (
				latest.grantID !== metadata.grantID ||
				latest.principal !== metadata.principal ||
				latest.expiresAt !== deadline
			) {
				return;
			}
		} catch {
			return;
		}
		terminal = true;
		worker.removeEventListener('message', ended);
		onSessionGone();
	};
	worker.addEventListener('message', ended);
	let timeout: ReturnType<typeof setTimeout> | undefined;
	try {
		await new Promise<void>((resolve, reject) => {
			timeout = setTimeout(() => reject(new Error('Worker session timed out')), HANDSHAKE_TIMEOUT);
			let phase: 'request' | 'issuing' | 'ready' = 'request';
			channel.port1.onmessage = async ({ data }: MessageEvent<unknown>) => {
				try {
					if ((await provider.loadIdentity()) !== identity) {
						throw new Error('Session changed');
					}
					if (phase === 'issuing') {
						throw new Error('Unexpected worker acknowledgement');
					}
					if (phase === 'ready') {
						if (readySchema.parse(data).generation !== generation) {
							throw new Error('Stale worker');
						}
						connected = true;
						resolve();
						return;
					}
					const { publicKey } = requestSchema.parse(data);
					phase = 'issuing';
					const delegated = await delegateMobileWorker(
						new Uint8Array(Buffer.from(publicKey, 'hex'))
					);
					if (delegated.principal !== metadata.principal || delegated.expiresAt !== deadline) {
						throw new Error('Session changed');
					}
					if ((await provider.loadIdentity()) !== identity) {
						throw new Error('Session changed');
					}
					phase = 'ready';
					channel.port1.postMessage({ generation, chain: delegated.chain });
				} catch {
					reject(new Error('Worker session rejected'));
				}
			};
			worker.postMessage(
				{
					msg: 'mobileSession',
					generation,
					principal: identity.getPrincipal().toText(),
					expiresAt: deadline
				},
				[channel.port2]
			);
		});
	} finally {
		if (!connected) {
			worker.removeEventListener('message', ended);
		}
		clearTimeout(timeout);
		channel.port1.close();
		channel.port2.close();
	}
};

export const installMobileWorkerSession = async ({
	port,
	session
}: {
	port: MessagePort;
	session: z.infer<typeof mobileWorkerInitSchema>;
}): Promise<void> => {
	const prepared = await prepareMobileSession({
		onSessionGone: () => {
			globalThis.postMessage({ msg: 'mobileSessionEnded', generation: session.generation });
		}
	});
	let timeout: ReturnType<typeof setTimeout> | undefined;
	try {
		await new Promise<void>((resolve, reject) => {
			timeout = setTimeout(() => reject(new Error('Worker session timed out')), HANDSHAKE_TIMEOUT);
			port.onmessage = async ({ data }: MessageEvent<unknown>) => {
				try {
					const response = responseSchema.parse(data);
					if (response.generation !== session.generation || session.expiresAt <= Date.now()) {
						throw new Error('Stale worker');
					}
					const identity = await acceptMobileSession({
						session: prepared,
						grant: {
							chain: response.chain,
							principal: session.principal,
							expiresAt: session.expiresAt
						}
					});
					AuthClientProvider.getInstance().setMobileIdentity(identity);
					port.postMessage({ generation: session.generation, ready: true });
					resolve();
				} catch {
					reject(new Error('Worker delegation rejected'));
				}
			};
			port.postMessage({ publicKey: Buffer.from(prepared.publicKey).toString('hex') });
		});
	} catch (error) {
		prepared.close();
		throw error;
	} finally {
		clearTimeout(timeout);
		port.close();
	}
};
