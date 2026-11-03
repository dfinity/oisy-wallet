import * as z from 'zod';

// Mainnet-only for now; XRPL testnet is a planned fast-follow (see the XRP spec).
export const XRP_NETWORK_TYPES = ['mainnet'] as const;

export const XrpNetworkSchema = z.enum(XRP_NETWORK_TYPES);
