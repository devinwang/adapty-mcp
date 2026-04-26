import { z } from 'zod';

export const PaywallProductSchema = z.object({
  vendor_product_id: z.string(),
  developer_id: z.string().optional(),
}).passthrough();

export const PaywallSchema = z.object({
  developer_id: z.string(),
  name: z.string(),
  revision: z.number().int().nonnegative(),
  products: z.array(PaywallProductSchema),
  remote_config: z.record(z.string(), z.unknown()).optional(),
}).passthrough();
export type AdaptyPaywall = z.infer<typeof PaywallSchema>;

export const PaywallUpdateInputSchema = z.object({
  developerId: z.string().min(1),
  name: z.string().min(1).optional(),
  remoteConfig: z.record(z.string(), z.unknown()).optional(),
  products: z.array(z.object({
    vendorProductId: z.string().min(1),
    developerId: z.string().min(1).optional(),
  })).optional(),
}).refine(
  v => v.name !== undefined || v.remoteConfig !== undefined || v.products !== undefined,
  { message: 'at least one mutable field (name, remoteConfig, products) required' },
);
export type PaywallUpdateInput = z.infer<typeof PaywallUpdateInputSchema>;
