<script lang="ts">
	import IconRetry from '$lib/components/icons/IconRetry.svelte';
	import ButtonIcon from '$lib/components/ui/ButtonIcon.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { emit } from '$lib/utils/events.utils';

	let visible = $state(false);

	let button = $state<HTMLButtonElement | undefined>();

	let loading = $state(false);

	const onClick = () => {
		loading = true;

		const callback = () => (loading = false);

		emit({
			message: 'oisyReloadCollections',
			detail: { callback }
		});
	};
</script>

<ButtonIcon
	ariaLabel={$i18n.navigation.alt.menu}
	colorStyle="muted"
	link={false}
	{loading}
	onclick={onClick}
	styleClass={visible ? 'active' : ''}
	bind:button
>
	{#snippet icon()}
		<IconRetry />
	{/snippet}
</ButtonIcon>
