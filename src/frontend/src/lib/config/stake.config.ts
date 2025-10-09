import { StakeProvider } from '$lib/types/stake';

export const stakeProvidersConfig: Record<
	StakeProvider,
	{
		name: string;
		logo: string;
		url: string;
	}
> = {
	[StakeProvider.GLDT]: {
		name: 'Gold DAO',
		logo: '/images/dapps/gold-dao-logo.svg',
		url: 'https://www.gold-dao.org/'
	}
};
