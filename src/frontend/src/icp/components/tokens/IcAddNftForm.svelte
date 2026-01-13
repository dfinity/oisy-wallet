<script lang="ts">
	import { assertNever, debounce, isEmptyString, isNullish } from '@dfinity/utils';
	import { untrack } from 'svelte';
	import { slide } from 'svelte/transition';
	import { detectNftCanisterStandard } from '$icp/services/ic-standard.services';
	import InputText from '$lib/components/ui/InputText.svelte';
	import MessageBox from '$lib/components/ui/MessageBox.svelte';
	import { MANAGE_TOKENS_IC_ADD_NFT_INPUT } from '$lib/constants/test-ids.constants';
	import { SLIDE_PARAMS } from '$lib/constants/transition.constants';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import type { CanisterIdText } from '$lib/types/canister';

	interface Props {
		extCanisterId?: string;
		dip721CanisterId?: string;
	}

	let { extCanisterId = $bindable(), dip721CanisterId = $bindable() }: Props = $props();

	let canisterId = $state<CanisterIdText | undefined>();

	let standardNotRecognized = $state(false);

	const updateCanisterId = async () => {
		extCanisterId = undefined;
		dip721CanisterId = undefined;

		if (isNullish($authIdentity)) {
			return;
		}

		if (isEmptyString(canisterId)) {
			return;
		}

		const standard = await detectNftCanisterStandard({
			identity: $authIdentity,
			canisterId
		});

		if (isNullish(standard)) {
			standardNotRecognized = true;

			return;
		}

		if (standard === 'ext') {
			extCanisterId = canisterId;

			standardNotRecognized = false;

			return;
		}

		if (standard === 'dip721') {
			dip721CanisterId = canisterId;

			standardNotRecognized = false;

			return;
		}

		assertNever(standard, `Unmapped IC NFT collection standard: ${standard}`);
	};

	const debounceUpdateCanisterId = debounce(updateCanisterId);

	$effect(() => {
		[$authIdentity, canisterId];

		untrack(() => debounceUpdateCanisterId());
	});
</script>

<p class="mb-6 text-sm">{$i18n.tokens.import.text.info_ext}</p>

<label class="font-bold" for="canisterId">
	{$i18n.tokens.import.text.canister_id}:
	<span class="text-brand-primary-alt">*</span>
</label>
<div>
	<InputText
		name="canisterId"
		placeholder="_____-_____-_____-_____-cai"
		testId={MANAGE_TOKENS_IC_ADD_NFT_INPUT}
		bind:value={canisterId}
	/>
</div>

{#if standardNotRecognized}
	<div class="mt-6" transition:slide={SLIDE_PARAMS}>
		<MessageBox level="warning">
			{$i18n.tokens.import.error.unrecognized_nft_canister_id_standard}
		</MessageBox>
	</div>
{/if}
