import * as z from 'zod';

export const XRP_NETWORK_TYPES = ['mainnet', 'testnet'] as const;

export const XrpNetworkSchema = z.enum(XRP_NETWORK_TYPES);
