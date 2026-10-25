'use client';

/** <select>, který po změně odešle svůj formulář (bez JS funguje tlačítko vedle). */
export default function AutoSubmitSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} onChange={(e) => e.currentTarget.form?.requestSubmit()} />;
}
