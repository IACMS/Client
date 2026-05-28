import { useId, useState } from "react";

type Props = {
  id?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  required?: boolean;
  hint?: string;
  className?: string;
};

/** Password field with show/hide toggle (matches login page pattern). */
export default function PasswordInput({
  id: idProp,
  label,
  value,
  onChange,
  autoComplete,
  required = false,
  hint,
  className = "",
}: Props) {
  const autoId = useId();
  const id = idProp ?? autoId;
  const [visible, setVisible] = useState(false);

  return (
    <div className={className}>
      <label className="block text-xs font-label-caps text-slate-500 mb-1 uppercase" htmlFor={id}>
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={visible ? "text" : "password"}
          className="w-full border border-slate-200 rounded-lg px-3 py-2 pr-10 text-sm"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          required={required}
        />
        <div className="absolute inset-y-0 right-0 pr-2 flex items-center">
          <button
            type="button"
            className="material-symbols-outlined text-lg text-slate-500 hover:text-slate-700 bg-transparent border-0 p-1 cursor-pointer"
            aria-label={visible ? "Hide password" : "Show password"}
            onClick={() => setVisible((v) => !v)}
          >
            {visible ? "visibility" : "visibility_off"}
          </button>
        </div>
      </div>
      {hint ? <p className="text-[11px] text-slate-500 mt-1">{hint}</p> : null}
    </div>
  );
}
