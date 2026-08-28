/**
 * Ported from member-client's `tooltip-contents`
 * (components/ichra_tooltips.cljs:11-56) so both apps explain a plan the same way.
 */
export type TooltipKey =
  | 'premium'
  | 'deductible'
  | 'outOfPocket'
  | 'perHousehold'
  | 'preTax'
  | 'postTax'
  | 'hsa'
  | 'easyEnroll'
  | 'selfEnroll'
  | 'tier'
  | 'bronze'
  | 'silver'
  | 'gold'
  | 'platinum'
  | 'catastrophic'
  | 'network'
  | 'hmo'
  | 'ppo'
  | 'epo'
  | 'pos'
  | 'providers'
  | 'prescriptions'

export const TOOLTIP_COPY: Record<TooltipKey, string> = {
  premium:
    'Your Monthly Premium — The amount of money you will pay after your employee benefit is applied to the full monthly premium.',
  deductible:
    'Deductible — Amount you must pay out of pocket before your health plan starts paying for care based on the terms of your plan.',
  outOfPocket:
    'Out-of-Pocket Max — The upper limit on how much you’ll have to pay out of pocket for health care in one year based on the terms of your plan.',
  perHousehold: 'Household — The total for all covered individuals on the plan.',
  preTax:
    'Pre-tax — The amount you will pay for your monthly premium will be deducted before taxes. Many Gravie members prefer pre-tax plans because it reduces their taxable income.',
  postTax:
    'Post-tax — The amount you will pay for your monthly premium will be deducted after taxes.',
  hsa: 'HSA — A Health Savings Account (HSA) is a tax-exempt savings account that allows you to set aside money to pay for qualified medical expenses.',
  easyEnroll:
    'Easy Enroll — Gravie will complete your plan enrollment for you after you select your plan.',
  selfEnroll:
    'Self-Enroll — You will need to complete manual steps to enroll in your plan with the selected health plan company after you select your plan.',
  tier: 'Tier Level — Categories used to explain health plan differences based on how much a health plan pays and how much you pay for your care. Higher tiers typically have higher monthly costs and lower out-of-pocket costs.',
  bronze:
    'Bronze — Choose if you prefer a lower monthly premium cost and accept higher out-of-pocket costs when you need care.',
  silver:
    'Silver — Choose if you prefer to balance your monthly premium cost with your out-of-pocket costs when you need care.',
  gold: 'Gold — Choose if you prefer to keep your out-of-pocket costs lower when you need care by paying a higher monthly premium cost.',
  platinum:
    'Platinum — Choose if you prefer the highest level of coverage with the lowest out-of-pocket costs for medical care by paying the highest monthly premium.',
  catastrophic:
    'Catastrophic — Choose if you prefer to cover only really big or serious medical expenses like accidents or major illnesses. These plans are available to some people under 30 or those who qualify for a hardship exemption.',
  network:
    'Network Type — The type of network decides where you can get medical care, how much you have to pay when you see a provider, and how easy it is to access a specialist.',
  hmo: 'Health Maintenance Organization (HMO) — Requires members to receive care from a defined network of healthcare providers and typically requires a referral from a primary care doctor to access a specialist.',
  ppo: 'Preferred Provider Organization (PPO) — Offers a defined network of preferred providers that allows members to see any doctor or specialist without a referral. There is often a higher cost to go out of the defined network.',
  epo: 'Exclusive Provider Organization (EPO) — Only covers services from doctors, specialists, or hospitals within a defined network of providers, except in emergencies.',
  pos: 'Point-of-Service (POS) — Combines features of HMO and PPO plans, requiring referrals for specialists but offering some coverage for out-of-network care at a higher cost.',
  providers:
    'Providers — Number of your providers that are covered by the plan, out of the number of providers you selected.',
  prescriptions:
    'Prescriptions — Number of your prescriptions that are covered by the plan, out of the number of prescriptions you selected.',
}

const METAL_KEYS = new Set<TooltipKey>(['bronze', 'silver', 'gold', 'platinum', 'catastrophic'])
const PLAN_TYPE_KEYS = new Set<TooltipKey>(['hmo', 'ppo', 'epo', 'pos'])

/** Ideon's `expanded_bronze` has no entry of its own; it falls back to bronze. */
export function metalTooltip(metal: string | null): TooltipKey {
  const key = (metal ?? '').toLowerCase().replace('expanded_', '') as TooltipKey
  return METAL_KEYS.has(key) ? key : 'tier'
}

export function planTypeTooltip(planType: string | null): TooltipKey {
  const key = (planType ?? '').toLowerCase() as TooltipKey
  return PLAN_TYPE_KEYS.has(key) ? key : 'network'
}

/**
 * member-client's `:benefit` entry embeds a literal MEMBER_BENEFIT placeholder that
 * its renderer substitutes, so the amount is interpolated here rather than copied.
 */
export function benefitTooltip(formattedAllowance: string): string {
  return `After ${formattedAllowance} Benefit — Your company has given you a benefit for your monthly health plan premium. This is the amount of your benefit.`
}
