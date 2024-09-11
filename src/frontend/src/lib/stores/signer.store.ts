import { REPLICA_HOST } from '$lib/constants/app.constants';
import type { OptionSigner } from '$lib/types/signer';
import type { Identity } from '@dfinity/agent';
import {
	ICRC25_REQUEST_PERMISSIONS,
	ICRC27_ACCOUNTS,
	type AccountsPromptPayload,
	type PermissionsPromptPayload
} from '@dfinity/oisy-wallet-signer';
import { Signer } from '@dfinity/oisy-wallet-signer/signer';
import { isNullish } from '@dfinity/utils';
import { derived, writable, type Readable } from 'svelte/store';

export interface SignerContext {
	init: (params: { owner: Identity }) => void;
	reset: () => void;
	idle: Readable<boolean>;
	permissionsPrompt: {
		payload: Readable<PermissionsPromptPayload | undefined | null>;
		reset: () => void;
	};
}

export const initSignerContext = ({
	accountsPrompt
}: {
	accountsPrompt: (payload: AccountsPromptPayload) => void;
}): SignerContext => {
	let signer: OptionSigner;

	const permissionsPromptPayloadStore = writable<PermissionsPromptPayload | undefined | null>(
		undefined
	);

	const permissionsPromptPayload = derived(
		[permissionsPromptPayloadStore],
		([$permissionsPromptPayloadStore]) => $permissionsPromptPayloadStore
	);

	const idle = derived([permissionsPromptPayload], ([$permissionsPromptPayload]) =>
		isNullish($permissionsPromptPayload)
	);

	const init = ({ owner }: { owner: Identity }) => {
		signer = Signer.init({
			owner,
			host: REPLICA_HOST
		});

		signer.register({
			method: ICRC25_REQUEST_PERMISSIONS,
			prompt: (payload: PermissionsPromptPayload) => permissionsPromptPayloadStore.set(payload)
		});

		signer.register({
			method: ICRC27_ACCOUNTS,
			prompt: accountsPrompt
		});
	};

	const resetPermissionsPromptPayload = () => permissionsPromptPayloadStore.set(null);

	const reset = () => {
		resetPermissionsPromptPayload();

		signer?.disconnect();
		signer = null;
	};

	return {
		init,
		reset,
		idle,
		permissionsPrompt: {
			payload: permissionsPromptPayload,
			reset: resetPermissionsPromptPayload
		}
	};
};

export const SIGNER_CONTEXT_KEY = Symbol('signer');
