<script>
	import AllAirdropsList from '$lib/components/airdrops/AllAirdropsList.svelte';
	import PageTitle from '$lib/components/ui/PageTitle.svelte';
	import { i18n } from '$lib/stores/i18n.store';
    import ExternalLink from "$lib/components/ui/ExternalLink.svelte";
</script>

<div class="flex flex-row items-center">
    <PageTitle>{$i18n.airdrops.text.title}</PageTitle>

    <ExternalLink
            href="https://docs.oisy.com/rewards"
            ariaLabel={$i18n.airdrops.text.learn_more}
            iconVisible={false}
            color="blue"
            styleClass={`ml-auto font-semibold`}
    >
        {$i18n.airdrops.text.learn_more}
    </ExternalLink>
</div>

<AllAirdropsList />
