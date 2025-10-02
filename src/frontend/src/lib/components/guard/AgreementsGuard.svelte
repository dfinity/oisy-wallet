<script lang="ts">
	import { queryAndUpdate } from '@dfinity/utils';
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

			// As additional safe measure we do not start accepting agreements if there are no agreements to accept.
			// This allows the `$effect` rune to be re-triggered again if `agreementsToAccept` changes,
			// since the `accepting` variable is still set to `false`.
			if (Object.keys($agreementsToAccept).length === 0) {
				return;
			}

			queryAndUpdate({
				request: async ({ identity }) => {
					accepting = true;

					await acceptAgreements({
						identity,
						agreementsToAccept: $agreementsToAccept,
						currentUserVersion: $userProfileVersion
					});
				},
				onLoad: ({ certified }) => {
					if (certified) {
						accepting = false;
					}
				},
				onUpdateError: () => {
					accepting = false;
				},
				identity: $authIdentity,
				resolution: 'all_settled',
				strategy: 'update'
			});
		}
	});
</script>

{@render children()}
