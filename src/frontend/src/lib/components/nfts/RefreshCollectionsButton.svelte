<script lang="ts">
	import IconRetry from '$lib/components/icons/IconRetry.svelte';
	import ButtonIcon from '$lib/components/ui/ButtonIcon.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { emit } from '$lib/utils/events.utils';

	interface Props {
		testId?: string;
	}

	const { testId }: Props = $props();

	let visible = $state(false);

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
	ariaLabel={$i18n.core.text.refresh}
	colorStyle="muted"
	link={false}
	{loading}
	onclick={onClick}
	styleClass={visible ? 'active' : ''}
	{testId}
>
	{#snippet icon()}
		<IconRetry />
	{/snippet}
</ButtonIcon>
