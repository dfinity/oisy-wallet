<script lang="ts">
	import { goto } from '$app/navigation';
	import Badge from '$lib/components/ui/Badge.svelte';
	import { AppPath } from '$lib/constants/routes.constants';
	import { networkId } from '$lib/derived/network.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { formatStakeApyNumber } from '$lib/utils/format.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { networkUrl } from '$lib/utils/nav.utils';

	interface Props {
		apy: number;
	}

	let { apy }: Props = $props();

	let label = $derived(`${formatStakeApyNumber(apy)}% ${$i18n.earning.card_fields.apy}`);

	const openEarn = () =>
		goto(
			networkUrl({
				path: AppPath.Earn,
				networkId: $networkId,
				usePreviousRoute: false,
				fromRoute: null
			})
		);
</script>

<button
	class="hit-area relative flex rounded press"
	aria-label={replacePlaceholders($i18n.earning.text.top_rate_tag, { $apy: label })}
	onclick={openEarn}
	type="button"
>
	<Badge variant="success" width="w-fit">{label}</Badge>
</button>
