import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useSession } from "@/context/SessionContext";
import { ApiError, apiGet } from "@/lib/api";
import type { ApiCase } from "@/lib/casesApi";

type CasesResponse = { cases?: ApiCase[] };

type TenantApi = {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  isActive?: boolean;
  createdAt?: string;
};

type TenantResponse = { tenant?: TenantApi };

export default function AgencyDetailPage() {
  const { agencySlug } = useParams();
  const slug = useMemo(() => {
    const raw = agencySlug ? decodeURIComponent(agencySlug) : "";
    return raw.trim().toLowerCase();
  }, [agencySlug]);

  const { user } = useSession();
  const sessionCode = user?.tenant?.code?.toLowerCase() ?? "";
  const tenantId = user?.tenant?.id;

  const [tenant, setTenant] = useState<TenantApi | null>(null);
  const [caseCount, setCaseCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const slugMatchesSession = Boolean(slug && sessionCode && slug === sessionCode);

  useEffect(() => {
    let cancelled = false;
    if (!slugMatchesSession || !tenantId) {
      setTenant(null);
      setCaseCount(null);
      setError(slug && !slugMatchesSession ? "This profile URL does not match your signed-in tenant." : null);
      return;
    }
    (async () => {
      setError(null);
      try {
        const [tRes, cRes] = await Promise.all([
          apiGet(`/api/v1/tenants/${encodeURIComponent(tenantId)}`) as Promise<TenantResponse>,
          apiGet(`/api/v1/cases?tenantId=${encodeURIComponent(tenantId)}`) as Promise<CasesResponse>,
        ]);
        if (cancelled) return;
        setTenant(tRes.tenant ?? null);
        const list = Array.isArray(cRes.cases) ? cRes.cases : [];
        setCaseCount(list.length);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof ApiError ? e.message : "Failed to load agency profile.");
        setTenant(null);
        setCaseCount(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slugMatchesSession, tenantId]);

  if (!slug) {
    return (
      <div className="p-gutter max-w-3xl mx-auto w-full pb-10">
        <div className="bg-white border border-outline-variant rounded-xl p-xl text-center">
          <h1 className="font-h2 text-primary mb-2">Agency not found</h1>
          <Link to="/agencies" className="text-primary font-semibold hover:underline">
            Back to directory
          </Link>
        </div>
      </div>
    );
  }

  if (!slugMatchesSession) {
    return (
      <div className="p-gutter max-w-3xl mx-auto w-full pb-10">
        <div className="bg-white border border-outline-variant rounded-xl p-xl text-center">
          <span className="material-symbols-outlined text-5xl text-slate-300 mb-4 inline-block">travel_explore</span>
          <h1 className="font-h2 text-primary mb-2">Agency not available</h1>
          <p className="font-body-md text-slate-600 mb-6">
            The Vite client only loads the tenant you signed in with (
            <span className="font-mono text-sm">{sessionCode || "none"}</span>
            ). URL requested: <span className="font-mono text-sm">{slug}</span>.
          </p>
          <Link to="/agencies" className="inline-flex items-center gap-2 bg-primary text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-primary-container transition-colors">
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            Back to directory
          </Link>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-gutter max-w-3xl mx-auto w-full pb-10">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-xl">
          <h1 className="font-h2 text-primary mb-2">Could not load profile</h1>
          <p className="text-sm text-amber-900 mb-4">{error}</p>
          <Link to="/agencies" className="text-primary font-semibold hover:underline">
            ← Back
          </Link>
        </div>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="flex-1 p-lg max-w-7xl mx-auto flex items-center justify-center min-h-[280px] text-slate-600">
        <span className="material-symbols-outlined text-4xl animate-pulse">progress_activity</span>
        <span className="ml-3">Loading agency…</span>
      </div>
    );
  }

  return (
    <div className="flex-1 p-gutter max-w-7xl mx-auto w-full pb-10">
      <div className="mb-lg">
        <nav className="flex text-label-caps text-slate-500 mb-2 uppercase tracking-widest flex-wrap gap-x-1 items-center">
          <Link to="/agencies" className="hover:text-primary">
            Agencies
          </Link>
          <span className="mx-2">/</span>
          <span>{tenant.code}</span>
          <span className="mx-2">/</span>
          <span className="text-primary font-bold">{tenant.name}</span>
        </nav>
        <div className="flex justify-between items-start gap-4 flex-wrap">
          <div>
            <h1 className="font-h1 text-primary mb-1">{tenant.name}</h1>
            <p className="font-body-md text-slate-600">Tenant code {tenant.code}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span
              className={`px-3 py-1 rounded-full text-label-caps font-bold border ${
                tenant.isActive === false ? "bg-amber-50 text-amber-800 border-amber-200" : "bg-green-50 text-green-800 border-green-200"
              }`}
            >
              {tenant.isActive === false ? "INACTIVE" : "ACTIVE"}
            </span>
            <span className="text-xs font-system-id text-slate-400">{caseCount === null ? "—" : `${caseCount} case(s)`}</span>
          </div>
        </div>
      </div>

      <div className="bg-white border border-outline-variant rounded-xl overflow-hidden min-h-[400px] p-lg">
        <h2 className="font-h3 text-primary mb-4">Overview</h2>
        <p className="font-body-md text-slate-600 whitespace-pre-wrap">
          {tenant.description?.trim() ? tenant.description : "No description from the tenant record."}
        </p>
        {tenant.createdAt && (
          <p className="text-xs text-slate-400 mt-6 font-mono">Created {new Date(tenant.createdAt).toLocaleString()}</p>
        )}
      </div>
    </div>
  );
}
