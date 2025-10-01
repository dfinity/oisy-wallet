<script lang="ts">
	import type { Snippet } from 'svelte';
	import AgreementsBanner from '$lib/components/agreements/AgreementsBanner.svelte';
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

		if ($noAgreementVisionedYet || $hasOutdatedAgreements) {
			acceptAgreements({
				identity: $authIdentity,
				agreementsToAccept: $agreementsToAccept,
				currentUserVersion: $userProfileVersion
			});
		}
	});
</script>

{@render children()}

{#if $hasOutdatedAgreements}
	<AgreementsBanner />
{/if}
