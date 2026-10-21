import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

interface FieldWrapperProps {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}

export function FieldWrapper({ label, htmlFor, error, hint, children }: FieldWrapperProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium text-neutral-800">
        {label}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-neutral-500">{hint}</p>}
      {error && (
        <p className="text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

const inputBaseClass =
  "w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:bg-neutral-100";

interface InputFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

export function InputField({ label, error, hint, id, className = "", ...props }: InputFieldProps) {
  return (
    <FieldWrapper label={label} htmlFor={id!} error={error} hint={hint}>
      <input id={id} className={`${inputBaseClass} ${className}`} {...props} />
    </FieldWrapper>
  );
}

interface TextareaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  hint?: string;
}

export function TextareaField({ label, error, hint, id, className = "", ...props }: TextareaFieldProps) {
  return (
    <FieldWrapper label={label} htmlFor={id!} error={error} hint={hint}>
      <textarea id={id} className={`${inputBaseClass} min-h-[100px] resize-y ${className}`} {...props} />
    </FieldWrapper>
  );
}

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  hint?: string;
}

export function SelectField({ label, error, hint, id, className = "", children, ...props }: SelectFieldProps) {
  return (
    <FieldWrapper label={label} htmlFor={id!} error={error} hint={hint}>
      <select id={id} className={`${inputBaseClass} ${className}`} {...props}>
        {children}
      </select>
    </FieldWrapper>
  );
}
