import { EarningCardFields } from '$env/types/env.earning-cards';
import type { EarningProvider, EarningProviderData } from '$lib/types/earning-provider';
import { readable } from 'svelte/store';

export const mockHarvestAutopilotCardConfig = {
	id: 'harvest-autopilot',
	titles: ['mock.harvest.title'],
	description: 'mock.harvest.description',
	logo: '/mock/harvest-logo.svg',
	fields: [
		EarningCardFields.NETWORKS,
		EarningCardFields.ASSETS,
		EarningCardFields.CURRENT_EARNING,
		EarningCardFields.EARNING_POTENTIAL
	],
	actionText: 'mock.harvest.action'
};

export const mockHarvestProviderData: EarningProviderData = {
	[EarningCardFields.APY]: '5.5',
	[EarningCardFields.CURRENT_STAKED]: 100,
	[EarningCardFields.CURRENT_EARNING]: 5.5,
	[EarningCardFields.NETWORKS]: ['eth-icon'],
	[EarningCardFields.ASSETS]: ['usdc-icon'],
	[EarningCardFields.EARNING_POTENTIAL]: 49.5,
	action: vi.fn().mockResolvedValue(undefined)
};

export const mockHarvestProvider: EarningProvider = {
	id: 'harvest-autopilot',
	type: 'stake',
	card: mockHarvestAutopilotCardConfig,
	data: readable(mockHarvestProviderData)
};

export const mockLiquidiumBorrowCardConfig = {
	id: 'liquidium',
	titles: ['mock.liquidium.title'],
	description: 'mock.liquidium.description',
	logo: '/mock/liquidium-logo.svg',
	fields: [
		EarningCardFields.NETWORKS,
		EarningCardFields.ASSETS,
		EarningCardFields.CURRENT_BORROWING,
		EarningCardFields.INTEREST_PER_YEAR
	],
	actionText: 'mock.liquidium.action'
};

export const mockLiquidiumBorrowProviderData: EarningProviderData = {
	[EarningCardFields.APY]: '4.5',
	[EarningCardFields.NETWORKS]: ['eth-icon'],
	[EarningCardFields.ASSETS]: ['usdc-icon'],
	[EarningCardFields.CURRENT_BORROWING]: 100,
	[EarningCardFields.INTEREST_PER_YEAR]: 4.5,
	action: vi.fn().mockResolvedValue(undefined)
};

export const mockLiquidiumBorrowProvider: EarningProvider = {
	id: 'liquidium',
	type: 'lending',
	card: mockLiquidiumBorrowCardConfig,
	data: readable(mockLiquidiumBorrowProviderData)
};

export const mockGoldDaoCardConfig = {
	id: 'gold-dao-staking',
	titles: ['mock.golddao.title'],
	description: 'mock.golddao.description',
	logo: '/mock/gold-dao-logo.svg',
	fields: [
		EarningCardFields.APY,
		EarningCardFields.CURRENT_STAKED,
		EarningCardFields.CURRENT_EARNING,
		EarningCardFields.EARNING_POTENTIAL,
		EarningCardFields.TERMS
	],
	actionText: 'mock.golddao.action'
};

export const mockGoldDaoProviderData: EarningProviderData = {
	[EarningCardFields.APY]: '12.0',
	[EarningCardFields.CURRENT_STAKED]: 500,
	[EarningCardFields.CURRENT_EARNING]: 60,
	[EarningCardFields.EARNING_POTENTIAL]: 240,
	[EarningCardFields.TERMS]: 'earning.terms.flexible',
	action: vi.fn().mockResolvedValue(undefined)
};

export const mockGoldDaoProvider: EarningProvider = {
	id: 'gold-dao-staking',
	type: 'stake',
	card: mockGoldDaoCardConfig,
	data: readable(mockGoldDaoProviderData)
};
