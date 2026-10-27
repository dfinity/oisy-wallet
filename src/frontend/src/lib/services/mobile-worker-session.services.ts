import { AuthClientProvider } from '$lib/providers/auth-client.providers';
import {
	DelegationChain,
	DelegationIdentity,
	Ed25519KeyIdentity,
	Ed25519PublicKey,
	isDelegationValid
} from '@icp-sdk/core/identity';
import * as z from 'zod';

const requestSchema = z.object({ publicKey: z.string().regex(/^[a-f0-9]{88}$/) }).strict();
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

const expiresAt = (chain: DelegationChain): number =>
	Math.min(
		...chain.delegations.map(({ delegation }) => Number(delegation.expiration / BigInt(1_000_000)))
	);
const HANDSHAKE_TIMEOUT = 15_000;

// A new worker owns its key. Only public keys and signed delegations cross its dedicated port.
export const connectMobileWorkerSession = async (
	worker: Pick<Worker, 'postMessage'>
): Promise<void> => {
	const provider = AuthClientProvider.getInstance();
	const identity = await provider.loadIdentity();
	if (!(identity instanceof DelegationIdentity)) {
		throw new Error('Mobile session unavailable');
	}
	const previous = identity.getDelegation();
	const generation = crypto.randomUUID();
	const deadline = expiresAt(previous);
	const channel = new MessageChannel();
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
						resolve();
						return;
					}
					const { publicKey } = requestSchema.parse(data);
					phase = 'issuing';
					const chain = await DelegationChain.create(
						identity,
						Ed25519PublicKey.fromDer(Buffer.from(publicKey, 'hex')),
						new Date(deadline),
						{ previous }
					);
					if ((await provider.loadIdentity()) !== identity) {
						throw new Error('Session changed');
					}
					phase = 'ready';
					channel.port1.postMessage({ generation, chain: JSON.stringify(chain.toJSON()) });
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
	const key = Ed25519KeyIdentity.generate();
	let timeout: ReturnType<typeof setTimeout> | undefined;
	try {
		await new Promise<void>((resolve, reject) => {
			timeout = setTimeout(() => reject(new Error('Worker session timed out')), HANDSHAKE_TIMEOUT);
			port.onmessage = ({ data }: MessageEvent<unknown>) => {
				try {
					const response = responseSchema.parse(data);
					const chain = DelegationChain.fromJSON(response.chain);
					const identity = DelegationIdentity.fromDelegation(key, chain);
					if (
						response.generation !== session.generation ||
						!isDelegationValid(chain) ||
						expiresAt(chain) > session.expiresAt ||
						session.expiresAt <= Date.now() ||
						identity.getPrincipal().toText() !== session.principal ||
						Buffer.from(chain.delegations.at(-1)?.delegation.pubkey ?? []).toString('hex') !==
							Buffer.from(key.getPublicKey().toDer()).toString('hex')
					) {
						throw new Error('Invalid worker delegation');
					}
					AuthClientProvider.getInstance().setMobileIdentity(identity);
					port.postMessage({ generation: session.generation, ready: true });
					resolve();
				} catch {
					reject(new Error('Worker delegation rejected'));
				}
			};
			port.postMessage({ publicKey: Buffer.from(key.getPublicKey().toDer()).toString('hex') });
		});
	} finally {
		clearTimeout(timeout);
		port.close();
	}
};
