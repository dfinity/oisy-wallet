<script lang="ts">
	import type { Snippet } from 'svelte';
	import { fade } from 'svelte/transition';
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

{#if $hasAcceptedAllLatestAgreements}
		{@render children()}
{:else if $noAgreementVisionedYet || $hasOutdatedAgreements}
	<div in:fade={{ delay: 0, duration: 250 }}>
		<AcceptAgreementsModal />
	</div>
{/if}
