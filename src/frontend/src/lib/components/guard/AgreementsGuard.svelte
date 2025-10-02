<script lang="ts">
	import type { Snippet } from 'svelte';
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

	let accepting = false;

	$effect(() => {
		if ($hasAcceptedAllLatestAgreements) {
			return;
		}

		if ($noAgreementVisionedYet || $hasOutdatedAgreements) {
			if (accepting) {
				return;
			}

			accepting = true;

			console.log(
				'Accepting agreements',
				$noAgreementVisionedYet,
				$hasOutdatedAgreements,
				$agreementsToAccept
			);
			acceptAgreements({
				identity: $authIdentity,
				agreementsToAccept: $agreementsToAccept,
				currentUserVersion: $userProfileVersion
			});
		}

		// FIXME: it stills loads twice...
		return () => {
			accepting = false;
		};
	});
</script>

{@render children()}
