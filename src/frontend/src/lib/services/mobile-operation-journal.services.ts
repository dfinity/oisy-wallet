import { mobileEthSendNetwork } from '$eth/utils/mobile-send.utils';
import { MOBILE_SHELL } from '$lib/constants/mobile.constants';
import { AuthClientProvider } from '$lib/providers/auth-client.providers';
import {
	MobileOperationJournalSchema,
	MobileOperationSchema,
	MobileOperationsSchema,
	type MobileOperation
} from '$lib/schema/mobile-operation.schema';
import { requestMobileWallet } from '$lib/services/mobile-host.services';
import { i18n } from '$lib/stores/i18n.store';
import type { Token } from '$lib/types/token';
import type { Identity } from '@icp-sdk/core/agent';
import { get } from 'svelte/store';

export class MobileOperationSessionExpiredError extends Error {}
export class MobileOperationPendingError extends Error {}

export const assertMobileOperationSession = async (identity: Identity): Promise<void> => {
	if (!MOBILE_SHELL || (await AuthClientProvider.getInstance().loadIdentity()) !== identity) {
		throw new MobileOperationSessionExpiredError();
	}
};

const readJournal = async (identity: Identity) => {
	await assertMobileOperationSession(identity);
	const response = MobileOperationJournalSchema.parse(
		JSON.parse(await requestMobileWallet({ method: 'readOperations' }))
	);
	await assertMobileOperationSession(identity);
	return {
		revision: response.revision,
		operations: MobileOperationsSchema.parse(JSON.parse(response.value))
	};
};
export const loadMobileOperations = async (identity: Identity): Promise<MobileOperation[]> =>
	(await readJournal(identity)).operations;

// Native compare-and-swap makes writes atomic across overlapping async operations.
// A conflict fails closed: never broadcast/deposit after a failed persistence step.
const mutateJournal = async ({
	identity,
	update
}: {
	identity: Identity;
	update: (operations: MobileOperation[]) => MobileOperation[];
}): Promise<void> => {
	const { revision, operations } = await readJournal(identity);
	const value = JSON.stringify(MobileOperationsSchema.parse(update(operations)));
	await assertMobileOperationSession(identity);
	const saved = MobileOperationJournalSchema.parse(
		JSON.parse(await requestMobileWallet({ method: 'writeOperations', revision, value }))
	);
	if (!saved.revision || saved.revision === revision || saved.value !== value) {
		throw new Error('Operation journal acknowledgement mismatch');
	}
	await assertMobileOperationSession(identity);
};
export const saveMobileOperation = ({
	identity,
	operation,
	create = false,
	expected
}: {
	identity: Identity;
	operation: MobileOperation;
	create?: boolean;
	expected?: MobileOperation;
}): Promise<void> =>
	mutateJournal({
		identity,
		update: (operations) => {
			const existing = operations.find(({ id }) => id === operation.id);
			if (
				(create ? existing !== undefined : existing === undefined) ||
				(expected &&
					JSON.stringify(existing) !== JSON.stringify(MobileOperationSchema.parse(expected)))
			) {
				throw new MobileOperationPendingError(get(i18n).send.text.mobile_pending);
			}
			if (
				create &&
				operations.some((entry) =>
					entry.kind === 'evmSend' && operation.kind === 'evmSend'
						? entry.chainId === operation.chainId &&
							entry.from.toLowerCase() === operation.from.toLowerCase()
						: entry.kind === 'icpSwap' &&
							operation.kind === 'icpSwap' &&
							entry.pool === operation.pool
				)
			) {
				throw new MobileOperationPendingError(get(i18n).send.text.mobile_pending);
			}
			return [...operations.filter(({ id }) => id !== operation.id), operation];
		}
	});
export const finishMobileOperation = ({
	identity,
	id,
	expected
}: {
	identity: Identity;
	id: string;
	expected?: MobileOperation;
}): Promise<void> =>
	mutateJournal({
		identity,
		update: (operations) => {
			const current = operations.find((operation) => operation.id === id);
			if (
				expected &&
				JSON.stringify(current) !== JSON.stringify(MobileOperationSchema.parse(expected))
			) {
				throw new MobileOperationPendingError(get(i18n).send.text.mobile_pending);
			}
			return operations.filter((operation) => operation.id !== id);
		}
	});

export const persistMobileEthSend = async ({
	identity,
	token,
	from,
	to,
	hash,
	nonce
}: {
	identity: Identity;
	token: Token;
	from: string;
	to: string;
	hash: string;
	nonce: number;
}): Promise<void> => {
	const network = mobileEthSendNetwork(token);
	if (!network) {
		throw new Error('Unsupported mobile send network');
	}
	await saveMobileOperation({
		identity,
		create: true,
		operation: {
			id: crypto.randomUUID(),
			kind: 'evmSend',
			createdAt: Date.now(),
			chainId: String(network.chainId),
			from,
			to,
			symbol: token.symbol,
			hash,
			nonce
		}
	});
};
