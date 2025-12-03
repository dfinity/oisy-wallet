import goldDao from '$lib/assets/providers/gold-dao-logo.svg';
import type { Provider, ProviderId } from '$lib/types/provider';
import { parseProviderId } from '$lib/validation/provider.validation';

const GOLD_DAO_PROVIDER_SYMBOL = 'gold-dao-staking';

export const GOLD_DAO_PROVIDER_ID: ProviderId = parseProviderId(GOLD_DAO_PROVIDER_SYMBOL);

export const GOLD_DAO_PROVIDER: Provider = {
	id: GOLD_DAO_PROVIDER_ID,
	cardTitle: 'earning.providers.gold_dao_staking.cardTitle',
	logo: goldDao
};
