<script lang="ts">
	import type { Origin, PromptPayload } from '@dfinity/oisy-wallet-signer';
	import { isNullish, nonNullish } from '@dfinity/utils';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import type { Option } from '$lib/types/utils';

	export let payload: Option<PromptPayload>;

	let origin: Origin | undefined;
	$: origin = payload?.origin;

	const mapHost = (origin: Origin | undefined): string | undefined => {
		if (isNullish(origin)) {
			return undefined;
		}

		try {
			// If set we actually for sure that the $payload.origin is a valid URL but, for the state of the art, we still catch potential errors here too.
			const { host } = new URL(origin);
			return host;
		} catch {
			return undefined;
		}
	};

	let host: string | undefined;
	$: host = mapHost(origin);
</script>

{#if nonNullish(host) && nonNullish(origin)}
	<p class="break-normal text-center mb-6">
		Request from: <span class="font-bold text-brandeis-blue"
			><ExternalLink
				ariaLabel="Link to the dApp requesting permissions"
				href={origin}
				iconVisible={false}>{host}</ExternalLink
			></span
		>
	</p>
{/if}
