<script lang="ts">
	import type { NavigationTarget } from '@sveltejs/kit';
	import { afterNavigate, goto } from '$app/navigation';
	import IconArrowRight from '$lib/components/icons/IconArrowRight.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { AppPath } from '$lib/constants/routes.constants';
	import { EARNING_GOTO_BUTTON } from '$lib/constants/test-ids.constants';
	import { networkId } from '$lib/derived/network.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { networkUrl } from '$lib/utils/nav.utils';

	let fromRoute = $state<NavigationTarget | null>(null);

	afterNavigate(({ from }) => {
		fromRoute = from;
	});

	const path = $derived(
		networkUrl({
			path: AppPath.Earn,
			networkId: $networkId,
			usePreviousRoute: true,
			fromRoute
		})
	);
</script>

<Button
	colorStyle="success"
	onclick={() => goto(path)}
	styleClass="gap-1 flex-none px-12 font-semibold"
	testId={EARNING_GOTO_BUTTON}
	type="button"
>
	{$i18n.earning.text.go_to_earn}
	<IconArrowRight />
</Button>
