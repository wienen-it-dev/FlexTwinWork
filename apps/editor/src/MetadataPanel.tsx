import type { AppMetadata } from '@fwt/shared'

interface Props {
  metadata: AppMetadata
  onChange: (m: AppMetadata) => void
}

export function MetadataPanel({ metadata, onChange }: Props) {
  const update = <K extends keyof AppMetadata>(k: K, v: AppMetadata[K]) =>
    onChange({ ...metadata, [k]: v })

  return (
    <aside className="meta-panel">
      <header className="meta-header">
        <div className="meta-title">Aufgabenmetadaten</div>
        <div className="meta-sub">Modul 3 / Folie 22 (MVP1-Fokus)</div>
      </header>

      <Section title="Allgemein">
        <Field label="Version">
          <input value={metadata.version} onChange={(e) => update('version', e.target.value)} />
        </Field>
        <Field label="Zielarbeitsplatztyp">
          <input
            value={metadata.zielarbeitsplatztyp}
            onChange={(e) => update('zielarbeitsplatztyp', e.target.value)}
          />
        </Field>
        <Field label="Vorgabe Zeit/Stueck">
          <input
            value={metadata.vorgabeZeit}
            onChange={(e) => update('vorgabeZeit', e.target.value)}
          />
        </Field>
      </Section>

      <Section title="Skills & Zertifikate">
        <Field label="Benoetigte Skills (komma-sep.)">
          <input
            value={metadata.benoetigteSkills.join(', ')}
            onChange={(e) =>
              update(
                'benoetigteSkills',
                e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
              )
            }
          />
        </Field>
        <Field label="Zertifikate (komma-sep.)">
          <input
            value={metadata.zertifikate.join(', ')}
            onChange={(e) =>
              update(
                'zertifikate',
                e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
              )
            }
          />
        </Field>
      </Section>

      <Section title="Stueckliste">
        {metadata.stueckliste.length > 0 ? (
          <table className="meta-table">
            <thead><tr><th>Pos.</th><th>Bezeichnung</th><th>Menge</th></tr></thead>
            <tbody>
              {metadata.stueckliste.map((item, i) => (
                <tr key={i}><td>{item.position}</td><td>{item.bezeichnung}</td><td>{item.menge}</td></tr>
              ))}
            </tbody>
          </table>
        ) : <div className="muted">Noch keine Eintraege</div>}
      </Section>

      <Section title="Werkzeugwechselplan">
        {metadata.werkzeugwechselplan.length > 0 ? (
          <table className="meta-table">
            <thead><tr><th>Schritt</th><th>Werkzeug</th></tr></thead>
            <tbody>
              {metadata.werkzeugwechselplan.map((tc, i) => (
                <tr key={i}><td>{tc.schritt}</td><td>{tc.werkzeug}</td></tr>
              ))}
            </tbody>
          </table>
        ) : <div className="muted">Noch keine Eintraege</div>}
      </Section>

      <Section title="Zeichnungen">
        {metadata.zeichnungen.length > 0 ? (
          <ul className="meta-list">
            {metadata.zeichnungen.map((z, i) => <li key={i}>{z}</li>)}
          </ul>
        ) : <div className="muted">Noch keine Eintraege</div>}
      </Section>

      <Section title="Pruefplaene">
        <textarea rows={3} value={metadata.pruefplaene} onChange={(e) => update('pruefplaene', e.target.value)} />
      </Section>

      <Section title="Arbeitsanweisung">
        <textarea rows={4} value={metadata.arbeitsanweisung} onChange={(e) => update('arbeitsanweisung', e.target.value)} />
      </Section>

      <Section title="Ergonomische Parameter">
        <textarea rows={2} value={metadata.ergonomischeParameter} onChange={(e) => update('ergonomischeParameter', e.target.value)} />
      </Section>

      <Section title="Geraetekonfiguration">
        <textarea rows={2} value={metadata.geraetekonfiguration} onChange={(e) => update('geraetekonfiguration', e.target.value)} />
      </Section>

      <Section title="Wartungsplaene">
        <textarea rows={2} value={metadata.wartungsplaene} onChange={(e) => update('wartungsplaene', e.target.value)} />
      </Section>

      <Section title="Checklisten">
        {metadata.checklisten.length > 0 ? (
          <ul className="meta-list">
            {metadata.checklisten.map((c, i) => <li key={i}>{c}</li>)}
          </ul>
        ) : <div className="muted">Noch keine Eintraege</div>}
      </Section>
    </aside>
  )
}

function Section(props: { title: string; children: React.ReactNode }) {
  return (
    <section className="meta-section">
      <h3>{props.title}</h3>
      {props.children}
    </section>
  )
}

function Field(props: { label: string; children: React.ReactNode }) {
  return (
    <label className="meta-field">
      <span>{props.label}</span>
      {props.children}
    </label>
  )
}
