import { z } from "zod";
import { InfraiClient } from "./infrai_client";

const settingsSchema = z.object({
  trigger_balance: z.coerce.number().positive(),
  recharge_amount: z.coerce.number().positive(),
});

const settings = settingsSchema.parse({
  trigger_balance: process.env.RECHARGE_TRIGGER_BALANCE,
  recharge_amount: process.env.RECHARGE_AMOUNT,
});

const result = await InfraiClient.fromEnvironment().configureAutoRecharge(settings);
console.log("Automatic recharge configured:", result);
