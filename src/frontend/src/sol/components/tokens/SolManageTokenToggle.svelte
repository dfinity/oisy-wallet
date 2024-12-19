<script lang="ts">
	import { Toggle } from '@dfinity/gix-components';
	import { createEventDispatcher } from 'svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { isSplTokenToggleDisabled } from '$lib/utils/token-toggle.utils';
	import type { SolanaUserToken } from '$sol/types/spl-user-token';

	export let token: SolanaUserToken;

	let disabled = false;
	$: disabled = isSplTokenToggleDisabled(token);

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
</script>

<Toggle
	ariaLabel={checked ? $i18n.tokens.text.hide_token : $i18n.tokens.text.show_token}
	{disabled}
	bind:checked
	on:nnsToggle={toggle}
/>
