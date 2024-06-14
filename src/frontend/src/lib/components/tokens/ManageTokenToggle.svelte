<script lang="ts">
	import { Toggle } from '@dfinity/gix-components';
	import { i18n } from '$lib/stores/i18n.store';
	import { createEventDispatcher } from 'svelte';
	import { toastsShow } from '$lib/stores/toasts.store';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import type { ManageableToken } from '$lib/types/token';

	export let token: ManageableToken;

	let disabled = false;
	$: disabled = token.category === 'default';

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
<div role="button" on:click={onClick}>
	<Toggle
		ariaLabel={$i18n.tokens.text.hide_zero_balances}
		{disabled}
		bind:checked
		on:nnsToggle={toggle}
	/>
</div>
