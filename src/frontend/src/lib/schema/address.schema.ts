import { z } from 'zod';

export const AddressSchema = z.string();

export const BtcAddressSchema = AddressSchema.brand('BtcAddress');

export const EthAddressSchema = AddressSchema.brand('EthAddress');

export const SolAddressSchema = AddressSchema.brand('SolAddress');
