<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import ExtensionConnect from '$lib/components/extension/ExtensionConnect.svelte';
	import ExtensionSign from '$lib/components/extension/ExtensionSign.svelte';
	import MessageBox from '$lib/components/ui/MessageBox.svelte';
	import {
		OISY_EXTENSION_KEEP_ALIVE_MS,
		OISY_EXTENSION_REQUEST_PARAM,
		OISY_EXTENSION_USER_REJECTED_CODE,
		OISY_EXTENSION_USER_REJECTED_MESSAGE
	} from '$lib/constants/extension.constants';
	import { connectExtension } from '$lib/providers/extension.providers';
	import { ExtensionRequestMessageSchema } from '$lib/schema/extension.schema';
	import { i18n } from '$lib/stores/i18n.store';
	import type {
		ExtensionError,
		ExtensionOutgoingMessage,
		ExtensionPort,
		ExtensionRequest
	} from '$lib/types/extension';

	type Status = 'loading' | 'unreachable' | 'closed' | 'open' | 'done' | 'failed';

	let status = $state<Status>('loading');
	let request = $state<ExtensionRequest | undefined>();
	let failure = $state<string | undefined>();

	let port: ExtensionPort | undefined;

	const send = (message: ExtensionOutgoingMessage) => {
		try {
			port?.postMessage(message);
		} catch (_: unknown) {
			port = undefined;
		}
	};

	const respond = (result: unknown) => {
		if (isNullish(request)) {
			return;
		}

		send({ type: 'response', id: request.id, result });
		status = 'done';
	};

	const fail = (error: ExtensionError) => {
		if (isNullish(request)) {
			return;
		}

		send({ type: 'error', id: request.id, error });

		if (error.code === OISY_EXTENSION_USER_REJECTED_CODE) {
			status = 'done';
			return;
		}

		failure = error.message;
		status = 'failed';
	};

	const reject = () =>
		fail({
			code: OISY_EXTENSION_USER_REJECTED_CODE,
			message: OISY_EXTENSION_USER_REJECTED_MESSAGE
		});

	onMount(() => {
		const id = page.url.searchParams.get(OISY_EXTENSION_REQUEST_PARAM);

		port = connectExtension();

		if (isNullish(port)) {
			status = 'unreachable';
			return;
		}

		if (isNullish(id)) {
			status = 'closed';
			return;
		}

		port.onMessage.addListener((message) => {
			const parsed = ExtensionRequestMessageSchema.safeParse(message);

			if (!parsed.success || status !== 'loading') {
				return;
			}

			request = parsed.data.request ?? undefined;
			status = isNullish(request) ? 'closed' : 'open';
		});

		port.onDisconnect.addListener(() => {
			port = undefined;

			if (status === 'loading') {
				status = 'unreachable';
			} else if (status === 'open') {
				status = 'closed';
			}
		});

		send({ type: 'get-request', id });

		const keepAlive = setInterval(() => send({ type: 'ping' }), OISY_EXTENSION_KEEP_ALIVE_MS);

		return () => {
			clearInterval(keepAlive);
			port?.disconnect();
		};
	});
</script>

<div class="w-full">
	{#if status === 'loading'}
		<p class="text-center">{$i18n.extension.text.loading}</p>
	{:else if status === 'unreachable'}
		<MessageBox level="error">{$i18n.extension.text.no_extension}</MessageBox>
	{:else if status === 'closed'}
		<MessageBox level="info">{$i18n.extension.text.not_found}</MessageBox>
	{:else if status === 'done'}
		<p class="text-center">{$i18n.extension.text.done}</p>
	{:else if status === 'failed'}
		<MessageBox level="error">
			{$i18n.extension.text.failed}
			{#if nonNullish(failure)}<span class="block">{failure}</span>{/if}
		</MessageBox>
	{:else if request?.kind === 'sign'}
		<ExtensionSign onApprove={respond} onReject={fail} {request} />
	{:else if nonNullish(request)}
		<ExtensionConnect onApprove={respond} onReject={reject} {request} />
	{/if}
</div>
