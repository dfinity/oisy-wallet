<script lang="ts">
	import type { Origin, PayloadOrigin } from '@dfinity/oisy-wallet-signer';
	import { isNullish, nonNullish } from '@dfinity/utils';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { OptionString } from '$lib/types/string';
	import type { Option } from '$lib/types/utils';

	interface Props {
		payload: Option<PayloadOrigin>;
	}

	let { payload }: Props = $props();

	let origin: Origin | undefined = $derived(payload?.origin);

	const mapHost = (origin: Origin | undefined): OptionString => {
		if (isNullish(origin)) {
			return undefined;
		}

		try {
			// If set we are actually sure that the $payload.origin is a valid URL, thanks to the library but, for the state of the art, we still catch potential errors here too.
			const { host } = new URL(origin);
			return host;
		} catch {
			return null;
		}
	};

	// Null being used if mapping the origin does not work - i.e. invalid origin. Probably an edge case.

	let host: OptionString = $derived(mapHost(origin));
</script>

{#if nonNullish(origin)}
	<p class="mb-6 break-normal text-center">
		{$i18n.signer.origin.text.request_from}
		{#if nonNullish(host)}<span class="font-bold text-brand-primary-alt"
				><ExternalLink
					ariaLabel={$i18n.signer.origin.alt.link_to_dapp}
					href={origin}
					iconVisible={false}>{host}</ExternalLink
				></span
			>{:else}<span class="font-bold text-error-primary"
				>{$i18n.signer.origin.text.invalid_origin}</span
			>{/if}
	</p>
{/if}
