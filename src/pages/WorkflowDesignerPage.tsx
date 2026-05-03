import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { apiGet, apiPost } from "@/lib/api";

type WorkflowStep = { id: string; key: string; name: string; isInitial: boolean; isFinal: boolean; position: number };
type WorkflowTransition = { id: string; fromStepId: string; toStepId: string; name: string; requiresComment: boolean };
type ApiWorkflow = { id: string; name: string; status: string; steps: WorkflowStep[]; transitions: WorkflowTransition[] };

export default function WorkflowDesignerPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [workflow, setWorkflow] = useState<ApiWorkflow | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "ok" | "error">("loading");

  const loadWorkflow = async () => {
    try {
      const data = await apiGet(`/api/v1/workflows/${id}/full`) as { workflow: ApiWorkflow };
      setWorkflow(data.workflow);
      setLoadState("ok");
    } catch {
      setLoadState("error");
    }
  };

  useEffect(() => { loadWorkflow(); }, [id]);

  const handleAddStep = async () => {
    const name = prompt("Step Name (e.g. Initial Review):");
    if (!name) return;
    const key = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const isInitial = confirm("Is this the initial step?");
    const isFinal = !isInitial && confirm("Is this a final/terminal step?");
    
    try {
      await apiPost(`/api/v1/workflows/${id}/steps`, { name, key, isInitial, isFinal });
      loadWorkflow();
    } catch (e: any) {
      alert(e.message || "Failed to add step");
    }
  };

  const handleAddTransition = async () => {
    if (!workflow || workflow.steps.length < 2) return alert("Need at least 2 steps");
    const name = prompt("Transition Action Name (e.g. Approve):");
    if (!name) return;
    const fromKey = prompt(`From Step Key (Options: ${workflow.steps.map(s => s.key).join(', ')})`);
    const toKey = prompt(`To Step Key (Options: ${workflow.steps.map(s => s.key).join(', ')})`);
    
    const fromStep = workflow.steps.find(s => s.key === fromKey);
    const toStep = workflow.steps.find(s => s.key === toKey);
    
    if (!fromStep || !toStep) return alert("Invalid step keys");

    try {
      await apiPost(`/api/v1/workflows/${id}/transitions`, {
        name,
        fromStepId: fromStep.id,
        toStepId: toStep.id,
        requiresComment: true
      });
      loadWorkflow();
    } catch (e: any) {
      alert(e.message || "Failed to add transition");
    }
  };

  const handlePublish = async () => {
    if (!confirm("Are you sure? Once published, the workflow cannot be modified.")) return;
    try {
      await apiPost(`/api/v1/workflows/${id}/publish`, {});
      alert("Workflow published!");
      navigate('/workflows');
    } catch (e: any) {
      alert(e.message || "Publish failed. Ensure you have exactly one initial step.");
    }
  };

  if (loadState === "loading") return <div className="p-12 text-center text-slate-500"><span className="material-symbols-outlined animate-spin text-3xl">sync</span></div>;
  if (loadState === "error" || !workflow) return <div className="p-12 text-center text-red-500">Error loading workflow</div>;

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] bg-slate-50 overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-outline-variant p-4 flex justify-between items-center shrink-0 shadow-sm z-10">
        <div>
          <nav className="flex text-[10px] font-label-caps text-secondary mb-1 gap-x-2">
            <Link to="/workflows" className="hover:text-primary">WORKFLOWS</Link>
            <span>/</span>
            <span className="text-primary font-bold">DESIGNER</span>
          </nav>
          <h1 className="font-h2 text-slate-800 flex items-center gap-2">
            {workflow.name}
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${workflow.status === 'PUBLISHED' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>{workflow.status}</span>
          </h1>
        </div>
        <div className="flex gap-2">
          {workflow.status === 'DRAFT' && (
            <>
              <button onClick={handleAddStep} className="px-4 py-2 bg-white border border-slate-300 rounded text-sm font-semibold hover:bg-slate-50 transition-colors flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">add_circle</span> Add Step
              </button>
              <button onClick={handleAddTransition} className="px-4 py-2 bg-white border border-slate-300 rounded text-sm font-semibold hover:bg-slate-50 transition-colors flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">moving</span> Add Transition
              </button>
              <button onClick={handlePublish} className="px-4 py-2 bg-primary text-white rounded text-sm font-semibold hover:bg-teal-700 transition-colors flex items-center gap-2 shadow-sm">
                <span className="material-symbols-outlined text-[18px]">publish</span> Publish
              </button>
            </>
          )}
        </div>
      </div>

      {/* Canvas Area */}
      <div className="flex-1 p-6 overflow-auto bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] relative">
        {workflow.steps.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400">
            <span className="material-symbols-outlined text-6xl mb-4 opacity-50">account_tree</span>
            <p className="text-lg">Canvas is empty</p>
            <p className="text-sm">Add a step to begin designing.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-max">
            {workflow.steps.map(step => (
              <div key={step.id} className={`bg-white border-2 rounded-xl p-4 shadow-sm relative ${step.isInitial ? 'border-teal-500' : step.isFinal ? 'border-amber-500' : 'border-slate-200'}`}>
                {step.isInitial && <div className="absolute -top-3 left-4 bg-teal-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">INITIAL</div>}
                {step.isFinal && <div className="absolute -top-3 left-4 bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">FINAL</div>}
                
                <h3 className="font-bold text-slate-800 mt-2">{step.name}</h3>
                <p className="text-[10px] text-slate-400 font-mono mb-4">key: {step.key}</p>
                
                <div className="space-y-2 border-t border-slate-100 pt-3">
                  <p className="text-xs font-label-caps text-slate-500">OUTGOING TRANSITIONS</p>
                  {workflow.transitions.filter(t => t.fromStepId === step.id).length === 0 && (
                    <p className="text-xs text-slate-400 italic">None</p>
                  )}
                  {workflow.transitions.filter(t => t.fromStepId === step.id).map(t => {
                    const target = workflow.steps.find(s => s.id === t.toStepId);
                    return (
                      <div key={t.id} className="bg-slate-50 border border-slate-200 rounded p-2 text-xs flex justify-between items-center group">
                        <span className="font-semibold text-primary">{t.name}</span>
                        <span className="flex items-center gap-1 text-slate-500">
                          <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                          {target?.name}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
