<script lang="ts">
	import { assertNever, debounce, isEmptyString, isNullish } from '@dfinity/utils';
	import { untrack } from 'svelte';
	import { detectNftCanisterStandard } from '$icp/services/ic-standard.services';
	import InputText from '$lib/components/ui/InputText.svelte';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { toastsError } from '$lib/stores/toasts.store';
	import type { CanisterIdText } from '$lib/types/canister';

	interface Props {
		extCanisterId?: string;
		dip721CanisterId?: string;
	}

	let { extCanisterId = $bindable(), dip721CanisterId = $bindable() }: Props = $props();

	let canisterId = $state<CanisterIdText | undefined>();

	const updateCanisterId = async () => {
		extCanisterId = undefined;

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

		if (standard === 'ext') {
			extCanisterId = canisterId;

			return;
		}

		if (standard === 'dip721') {
			dip721CanisterId = canisterId;

			return;
		}

		if (isNullish(standard)) {
			toastsError({
				msg: { text: $i18n.tokens.import.error.unrecognized_nft_canister_id_standard }
			});

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
	<InputText name="canisterId" placeholder="_____-_____-_____-_____-cai" bind:value={canisterId} />
</div>
