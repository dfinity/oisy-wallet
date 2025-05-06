import { Principal } from '@dfinity/principal';

export const mockPoolData = {
	canisterId: Principal.fromText('aaaaa-aa'),
	token0: { address: 'token0_address', standard: 'icrc' },
	token1: { address: 'token1_address', standard: 'icrc' },
	fee: 3000n
};

export const getPoolMock = vi.fn().mockResolvedValue(mockPoolData);
export const factoryCreateMock = vi.fn().mockResolvedValue({ getPool: getPoolMock });

export const ICPSwapFactoryCanister = {
	create: factoryCreateMock
};

export const quoteMock = vi.fn().mockResolvedValue(100n);
export const swapMock = vi.fn().mockResolvedValue(99n);
export const depositMock = vi.fn().mockResolvedValue(1000n);
export const depositFromMock = vi.fn().mockResolvedValue(1000n);
export const withdrawMock = vi.fn().mockResolvedValue(50n);
export const getUserUnusedBalanceMock = vi.fn().mockResolvedValue({ balance0: 20n, balance1: 30n });

export const poolCreateMock = vi.fn().mockResolvedValue({
	quote: quoteMock,
	swap: swapMock,
	deposit: depositMock,
	depositFrom: depositFromMock,
	withdraw: withdrawMock,
	getUserUnusedBalance: getUserUnusedBalanceMock
});

export const ICPSwapPoolCanister = {
	create: poolCreateMock
};
