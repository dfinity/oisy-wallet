<script lang="ts">
	import type { Snippet } from 'svelte';
	import { fade } from 'svelte/transition';
	import { NEW_AGREEMENTS_ENABLED } from '$env/agreements.env';
	import AcceptAgreementsModal from '$lib/components/agreements/AcceptAgreementsModal.svelte';
	import {
		hasAcceptedAllLatestAgreements,
		hasOutdatedAgreements,
		noAgreementVisionedYet
	} from '$lib/derived/user-agreements.derived';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();
</script>

{#if $hasAcceptedAllLatestAgreements || !NEW_AGREEMENTS_ENABLED}
	<div in:fade>
		{@render children()}
	</div>
{:else if $noAgreementVisionedYet || $hasOutdatedAgreements}
	<div in:fade={{ delay: 0, duration: 250 }}>
		<AcceptAgreementsModal />
	</div>
{/if}
