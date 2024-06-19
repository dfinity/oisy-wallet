<script lang="ts">
	import { Toggle } from '@dfinity/gix-components';
	import { i18n } from '$lib/stores/i18n.store';
	import { createEventDispatcher } from 'svelte';
	import type { IcrcCustomToken } from '$icp/types/icrc-custom-token';
	import { toastsShow } from '$lib/stores/toasts.store';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	export let token: IcrcCustomToken;

	let outdated = false;
	$: outdated = token.indexCanisterVersion === 'outdated';

	let disabled = false;
	$: disabled = token.category === 'default' || outdated;

	let checked: boolean;
	$: checked = token.enabled;

	const dispatch = createEventDispatcher();

	const toggle = () => {
		if (disabled) {
			return;
		}

		checked = !checked;

		dispatch('icToken', {
			...token,
			enabled: checked
		});
	};

	const onClick = () => {
		if (!outdated) {
			return;
		}

		toastsShow({
			text: replacePlaceholders($i18n.tokens.manage.info.outdated_index_canister, {
				$token: token.name
			}),
			level: 'info',
			duration: 5000
		});
	};
</script>

<!-- svelte-ignore a11y-interactive-supports-focus -->
<!-- svelte-ignore a11y-click-events-have-key-events -->
<div class:outdated role="button" on:click={onClick}>
	<Toggle
		ariaLabel={$i18n.tokens.text.show_hide_token}
		{disabled}
		bind:checked
		on:nnsToggle={toggle}
	/>
</div>
