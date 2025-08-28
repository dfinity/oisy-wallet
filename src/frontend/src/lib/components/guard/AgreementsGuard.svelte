<script lang="ts">
	import { Modal } from '@dfinity/gix-components';
	import type { Snippet } from 'svelte';
	import { fade } from 'svelte/transition';
	import { LOADER_MODAL } from '$lib/constants/test-ids.constants';
	import {
		hasAcceptedAllLatestAgreements,
		hasOutdatedAgreements,
		noAgreementVisionedYet
	} from '$lib/derived/agreements.derived';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();

	let needsToSignAgreements = $derived($noAgreementVisionedYet || $hasOutdatedAgreements);
</script>

{#if needsToSignAgreements}
	<div in:fade={{ delay: 0, duration: 250 }}>
		<Modal testId={LOADER_MODAL}>
			<div class="stretch">
				MOCK MODAL to sign all agreements to whoever never did or to sign the outdated ones
			</div>
		</Modal>
	</div>
{:else if $hasAcceptedAllLatestAgreements}
	<div in:fade>
		{@render children()}
	</div>
{/if}
