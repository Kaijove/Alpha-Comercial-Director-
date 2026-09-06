/**
 * Vocabulary for the simulated commercial dataset.
 *
 * Names are deliberately plausible rather than "Company 1" / "Deal 2" - the
 * dashboard has to read like a real account base at a glance.
 */

export const CUSTOMER_NAMES: string[] = [
  'Aldermont Industries',
  'Balmoral Freight',
  'Bergstrom Metals',
  'Brightpath Consulting',
  'Calderon Foods',
  'Cardinal Packaging',
  'Cavendish Group',
  'Ceralta Chemicals',
  'Delmar Logistics',
  'Eastgate Manufacturing',
  'Ferrovia Rail Systems',
  'Fjordline Marine',
  'Granvia Construction',
  'Harborlight Energy',
  'Helvetia Precision',
  'Ironbridge Steel',
  'Kestrel Automation',
  'Lambert & Roe',
  'Larchmont Utilities',
  'Marbella Textiles',
  'Meridian Healthcare',
  'Northwind Logistics',
  'Novara Pharmaceuticals',
  'Oakridge Components',
  'Orbex Systems',
  'Pallas Engineering',
  'Pinehurst Retail',
  'Quintero Agro',
  'Redstone Materials',
  'Rossi Automotive',
  'Saltmarsh Beverages',
  'Sentinel Security',
  'Silverbrook Media',
  'Stonegate Insurance',
  'Tarnow Plastics',
  'Thalassa Shipping',
  'Vallmera Steel',
  'Vantage Technologies',
  'Verdanta Agrifood',
  'Westcliff Partners',
  'Wexford Machinery',
  'Zenith Instruments',
]

export const INDUSTRIES: string[] = [
  'Manufacturing',
  'Logistics',
  'Construction',
  'Energy',
  'Automotive',
  'Food & beverage',
  'Healthcare',
  'Retail',
  'Professional services',
  'Technology',
  'Chemicals',
  'Utilities',
]

export const REGIONS: string[] = ['North', 'South', 'East', 'West', 'Central', 'Export']

export const DEAL_SOURCES: string[] = [
  'Inbound',
  'Outbound',
  'Referral',
  'Partner',
  'Trade show',
  'Existing customer',
]

/**
 * Product lines per workspace sector. Falls back to a neutral B2B catalogue so
 * every sector produces credible deal names.
 */
export const SECTOR_PRODUCTS: Record<string, string[]> = {
  'Industrial manufacturing': [
    'Production line upgrade',
    'Boiler retrofit',
    'CNC cell installation',
    'Preventive maintenance contract',
    'Conveyor system',
    'Quality inspection system',
  ],
  'Software & SaaS': [
    'Platform licence',
    'Enterprise rollout',
    'Module expansion',
    'Annual renewal',
    'Implementation package',
    'Premium support plan',
  ],
  'IT services': [
    'Infrastructure migration',
    'Managed services contract',
    'Security assessment',
    'Helpdesk outsourcing',
    'Network refresh',
    'Cloud transition',
  ],
  'Professional services': [
    'Advisory retainer',
    'Process audit',
    'Transformation programme',
    'Compliance review',
    'Interim management',
    'Training programme',
  ],
  Consulting: [
    'Strategy engagement',
    'Operating model review',
    'Cost optimisation project',
    'Market entry study',
    'Post-merger integration',
    'Performance programme',
  ],
  Construction: [
    'Site development package',
    'Structural works',
    'Facade renovation',
    'Mechanical installation',
    'Framework agreement',
    'Fit-out project',
  ],
  'Logistics & transport': [
    'Distribution contract',
    'Warehouse automation',
    'Fleet renewal',
    'Cross-dock service',
    'Last-mile agreement',
    'Cold chain contract',
  ],
  'Wholesale & distribution': [
    'Annual supply agreement',
    'Category expansion',
    'Regional distribution deal',
    'Private label programme',
    'Stock replenishment contract',
    'Exclusivity agreement',
  ],
  'Energy & utilities': [
    'Grid upgrade',
    'Solar installation',
    'Energy efficiency programme',
    'Maintenance framework',
    'Metering rollout',
    'Supply contract',
  ],
  'Pharma & life sciences': [
    'Clinical supply agreement',
    'Lab equipment package',
    'Validation project',
    'Distribution licence',
    'Cold storage contract',
    'Quality systems upgrade',
  ],
  'Financial services': [
    'Portfolio mandate',
    'Treasury solution',
    'Risk platform licence',
    'Advisory agreement',
    'Payments integration',
    'Custody contract',
  ],
}

export const DEFAULT_PRODUCTS: string[] = [
  'Framework agreement',
  'Annual contract',
  'Expansion project',
  'Renewal',
  'Pilot programme',
  'Service agreement',
]

export function productsForSector(sector: string): string[] {
  return SECTOR_PRODUCTS[sector] ?? DEFAULT_PRODUCTS
}

export const ACTIVITY_SUMMARIES: Record<string, string[]> = {
  call: [
    'Discovery call with the operations lead',
    'Follow-up call on open questions',
    'Call to confirm decision timeline',
    'Introductory call with procurement',
  ],
  meeting: [
    'On-site meeting with the technical team',
    'Commercial review with the buying committee',
    'Workshop to scope requirements',
    'Meeting with the finance director',
  ],
  email: [
    'Sent specification summary',
    'Shared reference case',
    'Answered pricing questions',
    'Confirmed next steps by email',
  ],
  proposal: [
    'Proposal sent for review',
    'Revised proposal issued',
    'Commercial offer submitted',
  ],
  'follow-up': [
    'Follow-up after proposal',
    'Chased pending approval',
    'Checked in ahead of the decision date',
  ],
  note: [
    'Budget confirmed for this quarter',
    'Competitor also shortlisted',
    'Decision delayed to next board meeting',
    'Technical validation completed',
  ],
}
