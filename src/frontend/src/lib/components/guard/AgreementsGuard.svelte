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

{#if $noAgreementVisionedYet || $hasOutdatedAgreements}
	<div in:fade={{ delay: 0, duration: 250 }}>
		<AcceptAgreementsModal />
	</div>
{:else if $hasAcceptedAllLatestAgreements}
	<div in:fade>
		{@render children()}
	</div>
{:else}
	SIGNOUT here or something
{/if}
