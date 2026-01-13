<script lang="ts">
	import { isEmptyString, isNullish } from '@dfinity/utils';
	import { untrack } from 'svelte';
	import { detectNftCanisterStandard } from '$icp/services/ic-standard.services';
	import InputText from '$lib/components/ui/InputText.svelte';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import type { CanisterIdText } from '$lib/types/canister';
	import { toastsError } from '$lib/stores/toasts.store';

	interface Props {
		extCanisterId?: string;
	}

	let { extCanisterId = $bindable() }: Props = $props();

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
		}

					toastsError({
				msg: { text: $i18n.tokens.import.error.unrecognized_nft_canister_id_standard }
			});
	};

	$effect(() => {
		[$authIdentity, canisterId];

		untrack(() => updateCanisterId());
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
