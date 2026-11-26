import { useEffect, useId, useRef } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { label as labelOf } from '../lib/format';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

export function Button({ busy, variant = 'primary', children, disabled, className = '', ...rest }:
  ButtonHTMLAttributes<HTMLButtonElement> & { busy?: boolean; variant?: Variant }) {
  return (
    <button
      type="button"
      {...rest}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      className={`portal-button ${variant === 'primary' ? '' : variant} ${className}`.trim()}
    >
      {busy ? <span className="ui-spinner" aria-hidden="true" /> : null}
      {children}
    </button>
  );
}

export function Field({ label, hint, error, full, children }:
  { label: string; hint?: string; error?: string | null; full?: boolean; children: ReactNode }) {
  return (
    <label className={`portal-field ${full ? 'portal-field-full' : ''}`}>
      <span>{label}</span>
      {children}
      {error ? <small className="ui-field-error">{error}</small> : hint ? <small className="ui-hint">{hint}</small> : null}
    </label>
  );
}

export function Card({ title, actions, children, className = '' }:
  { title?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`portal-card ${className}`}>
      {(title || actions) && (
        <header className="ui-card-head">
          {title ? <h2>{title}</h2> : <span />}
          {actions ? <div className="ui-card-actions">{actions}</div> : null}
        </header>
      )}
      {children}
    </section>
  );
}

const TONE: Record<string, 'ok' | 'warn' | 'bad' | 'muted' | 'info'> = {
  APPROVED: 'ok', ACTIVE: 'ok',
  PENDING: 'warn', PENDING_KYC: 'warn', UNDER_REVIEW: 'warn', SUBMITTED: 'warn', DRAFT: 'info',
  REJECTED: 'bad', REVOKED: 'bad', SUSPENDED: 'bad', DEACTIVATED: 'bad',
  ARCHIVED: 'muted', INACTIVE: 'muted',
};

export function Pill({ value, text }: { value: string; text?: string }) {
  return <span className={`ui-pill ui-pill-${TONE[value] ?? 'info'}`}>{text ?? labelOf(value)}</span>;
}

export function Banner({ tone = 'info', children }: { tone?: 'info' | 'error' | 'ok' | 'warn'; children: ReactNode }) {
  return <div className={`ui-banner ui-banner-${tone}`} role={tone === 'error' ? 'alert' : 'status'}>{children}</div>;
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="ui-empty">
      <strong>{title}</strong>
      {children ? <div>{children}</div> : null}
    </div>
  );
}

export function Loading({ text = 'Loading…' }: { text?: string }) {
  return <div className="ui-loading"><span className="ui-spinner" aria-hidden="true" />{text}</div>;
}

// Standard loading/error wrapper for a page section.
export function Async({ loading, error, onRetry, children }:
  { loading: boolean; error: string | null; onRetry?: () => void; children: ReactNode }) {
  if (error) {
    return (
      <Banner tone="error">
        {error}
        {onRetry ? <Button variant="ghost" onClick={onRetry} className="ui-inline-btn">Try again</Button> : null}
      </Banner>
    );
  }
  if (loading) return <Loading />;
  return <>{children}</>;
}

export function Modal({ title, onClose, children, footer, wide }:
  { title: string; onClose: () => void; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  const id = useId();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    ref.current?.querySelector<HTMLElement>('input, select, textarea, button')?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="ui-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={ref} className={`ui-modal ${wide ? 'ui-modal-wide' : ''}`} role="dialog" aria-modal="true" aria-labelledby={id}>
        <header>
          <h2 id={id}>{title}</h2>
          <button type="button" className="ui-close" onClick={onClose} aria-label="Close">×</button>
        </header>
        <div className="ui-modal-body">{children}</div>
        {footer ? <footer>{footer}</footer> : null}
      </div>
    </div>
  );
}

export function Tabs<T extends string>({ value, options, onChange }:
  { value: T; options: { value: T; label: string; count?: number }[]; onChange: (v: T) => void }) {
  return (
    <div className="ui-tabs" role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={o.value === value}
          className={o.value === value ? 'active' : ''}
          onClick={() => onChange(o.value)}
        >
          {o.label}{o.count !== undefined ? <span className="ui-tab-count">{o.count}</span> : null}
        </button>
      ))}
    </div>
  );
}

export function Pager({ page, limit, total, onPage }:
  { page: number; limit: number; total: number; onPage: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / limit));
  if (total <= limit) return null;
  return (
    <div className="ui-pager">
      <Button variant="secondary" disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</Button>
      <span>Page {page} of {pages} · {total} total</span>
      <Button variant="secondary" disabled={page >= pages} onClick={() => onPage(page + 1)}>Next</Button>
    </div>
  );
}

export function KeyValues({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl className="ui-kv">
      {rows.map(([k, v]) => (
        <div key={k}><dt>{k}</dt><dd>{v ?? '—'}</dd></div>
      ))}
    </dl>
  );
}

export function PageIntro({ children }: { children: ReactNode }) {
  return <p className="portal-section-intro">{children}</p>;
}
