import type { ReactNode } from 'react';

type Props = {
  title: string;
  children: ReactNode;
};

export function LegalSection({ title, children }: Props) {
  return (
    <section className="legal-section">
      <h3 className="legal-section__title">{title}</h3>
      <div className="legal-section__body">{children}</div>
    </section>
  );
}
