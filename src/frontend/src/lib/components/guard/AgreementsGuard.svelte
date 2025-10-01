<script lang="ts">
	import { onMount, type Snippet } from 'svelte';
	import { fade } from 'svelte/transition';
	import AcceptAgreementsModal from '$lib/components/agreements/AcceptAgreementsModal.svelte';
	import { authIdentity } from '$lib/derived/auth.derived';
	import {
		agreementsToAccept,
		hasAcceptedAllLatestAgreements,
		hasOutdatedAgreements,
		noAgreementVisionedYet
	} from '$lib/derived/user-agreements.derived';
	import { userProfileVersion } from '$lib/derived/user-profile.derived';
	import { acceptAgreements } from '$lib/services/user-agreements.services';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();

	$effect(() => {
		if ($hasAcceptedAllLatestAgreements) {
			return;
		}

		if ($noAgreementVisionedYet) {
			acceptAgreements({
				identity: $authIdentity,
				agreementsToAccept: $agreementsToAccept,
				currentUserVersion: $userProfileVersion
			});
		}
	});
</script>

{#if $hasAcceptedAllLatestAgreements || $noAgreementVisionedYet}
	{@render children()}
{:else if $hasOutdatedAgreements}
	<div in:fade={{ delay: 0, duration: 250 }}>
		<AcceptAgreementsModal />
	</div>
{/if}
