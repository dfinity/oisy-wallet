import { ICP_ERC20_SYMBOL } from '$lib/constants/icp-erc20.constants';
import type { Token } from '$lib/types/token';

export const isErc20Icp = ({ symbol }: Token): boolean => symbol === ICP_ERC20_SYMBOL;
