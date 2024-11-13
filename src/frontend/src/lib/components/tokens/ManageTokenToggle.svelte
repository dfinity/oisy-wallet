<script lang="ts">
	import { Toggle } from '@dfinity/gix-components';
	import { createEventDispatcher } from 'svelte';
	import { type EthereumUserToken } from '$eth/types/erc20-user-token';
	import { i18n } from '$lib/stores/i18n.store';
	import { isEthereumTokenToggleDisabled } from '$lib/utils/token-toggle.utils';

	export let token: EthereumUserToken;

	let disabled = false;
	$: disabled = isEthereumTokenToggleDisabled(token);

	let checked: boolean;
	$: checked = token.enabled ?? false;

	const dispatch = createEventDispatcher();

	const toggle = () => {
		if (disabled) {
			return;
		}

		checked = !checked;

		dispatch('icShowOrHideToken', {
			...token,
			enabled: checked
		});
	};

	const onClick = () => {};
</script>

<!-- svelte-ignore a11y-interactive-supports-focus -->
<!-- svelte-ignore a11y-click-events-have-key-events -->
<div role="button" on:click={onClick}>
	<Toggle
		ariaLabel={checked ? $i18n.tokens.text.hide_token : $i18n.tokens.text.show_token}
		{disabled}
		bind:checked
		on:nnsToggle={toggle}
	/>
</div>
