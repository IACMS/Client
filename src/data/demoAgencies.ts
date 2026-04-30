export type DemoAgency = {
  slug: string;
  name: string;
  acronym: string;
  jurisdictionType: string;
  regionHq: string;
  liaisonName: string;
  liaisonRole: string;
  liaisonEmail: string;
  clearanceLevel: string;
  status: "ACTIVE" | "PROVISIONING" | "READ_ONLY";
  statusClass: string;
  openCases: number;
  escalatedCases: number;
  lastSync: string;
  description: string;
  address: string;
  dataSharing: string;
  tier: string;
};

export const DEMO_AGENCIES: readonly DemoAgency[] = [
  {
    slug: "federal-customs-authority",
    name: "Federal Customs Authority",
    acronym: "FCA",
    jurisdictionType: "Federal",
    regionHq: "National — Port District 4",
    liaisonName: "Elena Marquez",
    liaisonRole: "Director of Inter-Agency Operations",
    liaisonEmail: "e.marquez@fca.gov.demo",
    clearanceLevel: "LEVEL 4",
    status: "ACTIVE",
    statusClass: "bg-green-50 text-green-800 border-green-200",
    openCases: 184,
    escalatedCases: 3,
    lastSync: "2 min ago",
    description:
      "Primary federal partner for cross-border enforcement and maritime audit referrals. Maintains real-time case sync with Treasury and Transport channels.",
    address: "1200 Harbor Exchange, Washington, DC",
    dataSharing: "Full bilateral (MOU-2019-FCA-DSS)",
    tier: "TIER A",
  },
  {
    slug: "transport-security-admin",
    name: "Transport Security Administration",
    acronym: "TSA",
    jurisdictionType: "Federal",
    regionHq: "Mid-Atlantic Region",
    liaisonName: "James Okonkwo",
    liaisonRole: "Regional Compliance Lead",
    liaisonEmail: "j.okonkwo@tsa.gov.demo",
    clearanceLevel: "LEVEL 3",
    status: "ACTIVE",
    statusClass: "bg-green-50 text-green-800 border-green-200",
    openCases: 142,
    escalatedCases: 7,
    lastSync: "18 min ago",
    description:
      "Coordinates transit discrepancy investigations with state motor vehicle and port authorities. Elevated escalation volume this quarter.",
    address: "450 Field Ops Way, Arlington, VA",
    dataSharing: "Selective (passenger + cargo metadata)",
    tier: "TIER A",
  },
  {
    slug: "internal-audit-agency",
    name: "Internal Audit Agency",
    acronym: "IAA",
    jurisdictionType: "Federal oversight",
    regionHq: "Central Oversight Campus",
    liaisonName: "Priya Sethi",
    liaisonRole: "Chief Institutional Auditor",
    liaisonEmail: "p.sethi@iaa.gov.demo",
    clearanceLevel: "LEVEL 5",
    status: "ACTIVE",
    statusClass: "bg-green-50 text-green-800 border-green-200",
    openCases: 96,
    escalatedCases: 1,
    lastSync: "1 hour ago",
    description:
      "Independent reviewer for institutional compliance batches. Issues binding audit opinions on Sector reviews referred from partner agencies.",
    address: "1 Independence Plaza, Bethesda, MD",
    dataSharing: "Read-mostly (summaries + redacted exhibits)",
    tier: "TIER S",
  },
  {
    slug: "state-resource-board",
    name: "State Resource Board",
    acronym: "SRB",
    jurisdictionType: "State",
    regionHq: "Western Corridor",
    liaisonName: "Marcus Nguyen",
    liaisonRole: "Deputy Coordinator, Environmental Portfolio",
    liaisonEmail: "m.nguyen@srb.state.demo",
    clearanceLevel: "LEVEL 3",
    status: "PROVISIONING",
    statusClass: "bg-amber-50 text-amber-800 border-amber-200",
    openCases: 41,
    escalatedCases: 0,
    lastSync: "Yesterday",
    description:
      "State-level environmental and permitting authority. Completing onboarding for automated referral intake from Federal Customs.",
    address: "500 Capitol Annex, Boise, ID",
    dataSharing: "Pending activation",
    tier: "TIER B",
  },
  {
    slug: "cyber-intelligence-unit",
    name: "Cyber Intelligence Unit",
    acronym: "CIU",
    jurisdictionType: "Federal task force",
    regionHq: "National SOC East",
    liaisonName: "Andre Silva",
    liaisonRole: "Task Force Commander",
    liaisonEmail: "a.silva@ciu.dhs.demo",
    clearanceLevel: "LEVEL 5",
    status: "ACTIVE",
    statusClass: "bg-green-50 text-green-800 border-green-200",
    openCases: 228,
    escalatedCases: 12,
    lastSync: "10 mins ago",
    description:
      "Joint cybersecurity and infrastructure investigation cell. Highest case velocity; priority routing for escalation to Director-level workflow.",
    address: "Secure Facility — Listed as CIU-East",
    dataSharing: "Restricted (SOC-to-SOC pipelines only)",
    tier: "TIER A",
  },
];

export function getAgencyBySlug(slug: string): DemoAgency | undefined {
  const normalized = slug.trim().toLowerCase();
  return DEMO_AGENCIES.find((a) => a.slug === normalized);
}
