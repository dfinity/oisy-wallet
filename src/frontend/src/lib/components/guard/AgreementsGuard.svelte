<script lang="ts">
	import { queryAndUpdate } from '@dfinity/utils';
	import AgreementsBanner from '$lib/components/agreements/AgreementsBanner.svelte';
	import { authIdentity } from '$lib/derived/auth.derived';
	import {
		agreementsToAccept,
		hasAcceptedAllLatestAgreements,
		hasOutdatedAgreements,
		noAgreementVisionedYet,
		atLeastOneAgreementVisioned
	} from '$lib/derived/user-agreements.derived';
	import { userProfileVersion } from '$lib/derived/user-profile.derived';
	import { acceptAgreements } from '$lib/services/user-agreements.services';
	import type { AgreementsToAccept } from '$lib/types/user-agreements';

	let accepting = false;

	let initialAgreementsToAccept = $state<AgreementsToAccept>({});

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

			// The $effect rune cannot await async functions (in this case acceptAgreements).
			// That causes the `accepting` flag to be set to `false` before the async function is finished.
			// To avoid it, we use the service queryAndUpdate,
			// which handles the state of the request internally and has callbacks in case of awaited success or failure.
			queryAndUpdate({
				request: async ({ identity }) => {
					if ($atLeastOneAgreementVisioned && $hasOutdatedAgreements) {
						initialAgreementsToAccept = { ...$agreementsToAccept };
					}

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
				strategy: 'update'
			});
		}
	});
</script>

{#if Object.keys(initialAgreementsToAccept).length > 0}
	<div
		class="fixed top-6 left-[50%] z-10 flex min-w-80 -translate-x-[50%] justify-between gap-4 rounded-lg bg-primary"
	>
		<AgreementsBanner agreementsToAccept={initialAgreementsToAccept} />
	</div>
{/if}
