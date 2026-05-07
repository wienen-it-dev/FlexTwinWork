import { useEffect, useState } from 'react'
import { api } from './api'
import type { Step } from '@fwt/shared'

interface Props {
  step: Step
  stepIndex: number
  totalSteps: number
  vars: Record<string, string | number>
  executionId: string | null
  onNext: (outcome: string, varUpdates?: Record<string, string | number>) => void
}

const TYPE_LABELS: Record<Step['type'], string> = {
  anzeige: 'Anzeige',
  eingabe: 'Eingabe',
  multimedia: 'Multimedia',
  werkzeug_param: 'Werkzeug-Parametrierung',
  logik_if: 'Logik-Verzweigung',
  io_nio: 'IO / NIO Pruefung',
  foto: 'Foto aufnehmen',
  schnittstelle: 'Schnittstelle',
  zaehler: 'Zaehler',
  timer: 'Timer',
  feedback: 'Feedback',
}

export function StepRenderer({ step, stepIndex, totalSteps, executionId, onNext }: Props) {
  return (
    <div className="step-card">
      <div className="step-progress">
        Schritt {stepIndex} / ~{totalSteps}
        <div className="step-type-badge" data-type={step.type}>
          {TYPE_LABELS[step.type]}
        </div>
      </div>
      <div className="step-body">{renderBody(step, executionId, onNext)}</div>
    </div>
  )
}

function renderBody(step: Step, executionId: string | null, onNext: Props['onNext']) {
  switch (step.type) {
    case 'anzeige': return <AnzeigeView step={step} onNext={onNext} />
    case 'eingabe': return <EingabeView step={step} onNext={onNext} />
    case 'multimedia': return <MultimediaView step={step} onNext={onNext} />
    case 'werkzeug_param': return <WerkzeugView step={step} onNext={onNext} />
    case 'io_nio': return <IoNioView step={step} onNext={onNext} />
    case 'foto': return <FotoView step={step} onNext={onNext} />
    case 'schnittstelle': return <SchnittstelleView step={step} executionId={executionId} onNext={onNext} />
    case 'zaehler': return <ZaehlerView step={step} onNext={onNext} />
    case 'timer': return <TimerView step={step} onNext={onNext} />
    case 'feedback': return <FeedbackView step={step} onNext={onNext} />
    case 'logik_if': return <div className="muted">Logik wird ausgewertet...</div>
  }
}

function AnzeigeView({ step, onNext }: { step: Extract<Step, { type: 'anzeige' }>; onNext: Props['onNext'] }) {
  return (
    <>
      <p className="step-text">{step.text}</p>
      <NextButton onClick={() => onNext('bestaetigt')}>Weiter</NextButton>
    </>
  )
}

function EingabeView({ step, onNext }: { step: Extract<Step, { type: 'eingabe' }>; onNext: Props['onNext'] }) {
  const [val, setVal] = useState('')
  const submit = () => {
    const v: string | number = step.inputType === 'number' ? Number(val) : val
    onNext(`${step.variable} = ${v}${step.unit ? ' ' + step.unit : ''}`, { [step.variable]: v })
  }
  return (
    <>
      <p className="step-text">{step.label}</p>
      <div className="input-row">
        <input
          autoFocus
          type={step.inputType === 'number' ? 'number' : 'text'}
          value={val}
          onChange={(e) => setVal(e.target.value)}
          placeholder={step.inputType === 'number' ? '0' : '...'}
        />
        {step.unit && <span className="input-unit">{step.unit}</span>}
      </div>
      <NextButton onClick={submit} disabled={val === ''}>Weiter</NextButton>
    </>
  )
}

function MultimediaView({ step, onNext }: { step: Extract<Step, { type: 'multimedia' }>; onNext: Props['onNext'] }) {
  return (
    <>
      <p className="step-text"><strong>{step.title}</strong></p>
      {step.mediaType === 'image' && <img src={step.url} alt={step.title} className="media-img" />}
      {step.mediaType === 'pdf' && <div className="media-placeholder">PDF-Vorschau (Demo): {step.url}</div>}
      {step.mediaType === 'video' && <div className="media-placeholder">Video-Player (Demo): {step.url}</div>}
      <NextButton onClick={() => onNext('angesehen')}>Weiter</NextButton>
    </>
  )
}

function WerkzeugView({ step, onNext }: { step: Extract<Step, { type: 'werkzeug_param' }>; onNext: Props['onNext'] }) {
  const [set, setSet] = useState(false)
  return (
    <>
      <p className="step-text">
        Werkzeug <strong>{step.toolName}</strong> wird parametriert:
      </p>
      <div className="param-box">
        {step.parameter}: <strong>{step.sollwert} {step.einheit}</strong>
      </div>
      {!set ? (
        <NextButton onClick={() => setSet(true)} variant="secondary">Sollwert an Werkzeug senden</NextButton>
      ) : (
        <>
          <div className="success-msg">Sollwert gesetzt &check;</div>
          <NextButton onClick={() => onNext(`${step.parameter}=${step.sollwert}${step.einheit}`)}>Weiter</NextButton>
        </>
      )}
    </>
  )
}

function IoNioView({ step, onNext }: { step: Extract<Step, { type: 'io_nio' }>; onNext: Props['onNext'] }) {
  const [decision, setDecision] = useState<'IO' | 'NIO' | null>(null)
  const [comment, setComment] = useState('')
  const submit = () => onNext(`${decision}${comment ? ' - ' + comment : ''}`)
  return (
    <>
      <p className="step-text">{step.prompt}</p>
      {decision === null ? (
        <div className="iolist">
          <button className="big-btn ok" onClick={() => setDecision('IO')}>IO</button>
          <button className="big-btn nok" onClick={() => setDecision('NIO')}>NIO</button>
        </div>
      ) : (
        <>
          <div className="success-msg">Auswahl: {decision}</div>
          {(step.requireComment || decision === 'NIO') && (
            <textarea
              placeholder="Kommentar..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={2}
            />
          )}
          <NextButton onClick={submit}>Weiter</NextButton>
        </>
      )}
    </>
  )
}

function FotoView({ step, onNext }: { step: Extract<Step, { type: 'foto' }>; onNext: Props['onNext'] }) {
  const [taken, setTaken] = useState(false)
  return (
    <>
      <p className="step-text">{step.prompt}</p>
      {!taken ? (
        <NextButton onClick={() => setTaken(true)} variant="secondary">Foto aufnehmen (Demo)</NextButton>
      ) : (
        <>
          <div className="media-placeholder">[Foto-Platzhalter - Kamera in Live-Demo]</div>
          <NextButton onClick={() => onNext('foto-aufgenommen')}>Weiter</NextButton>
        </>
      )}
    </>
  )
}

// Schnittstellen-Block: ruft tatsaechlich n8n auf -> n8n forwardet an externes System
function SchnittstelleView({ step, executionId, onNext }: { step: Extract<Step, { type: 'schnittstelle' }>; executionId: string | null; onNext: Props['onNext'] }) {
  const [state, setState] = useState<'idle' | 'sending' | 'ok' | 'err'>('idle')
  const [errMsg, setErrMsg] = useState<string>('')

  async function execute() {
    setState('sending')
    setErrMsg('')
    try {
      await api.forwardIntegration({
        protocol: step.protocol,
        endpoint: step.endpoint,
        action: step.action,
        payload: step.payload,
        execution_id: executionId ?? undefined,
      })
      setState('ok')
    } catch (err) {
      setErrMsg(err instanceof Error ? err.message : String(err))
      setState('err')
    }
  }

  return (
    <>
      <p className="step-text">
        {step.action === 'write' ? 'Sende' : 'Lese'} via <strong>{step.protocol}</strong>
      </p>
      <div className="param-box">
        Endpunkt: {step.endpoint}<br />
        {step.action === 'write' && <>Payload: {step.payload}</>}
      </div>
      {state === 'idle' && (
        <NextButton onClick={execute} variant="secondary">Aktion via n8n ausfuehren</NextButton>
      )}
      {state === 'sending' && <div className="muted">Sende an n8n...</div>}
      {state === 'ok' && (
        <>
          <div className="success-msg">Erfolgreich uebertragen &check;</div>
          <NextButton onClick={() => onNext(`${step.protocol} ${step.action} ok`)}>Weiter</NextButton>
        </>
      )}
      {state === 'err' && (
        <>
          <div className="error-msg">Fehler: {errMsg}</div>
          <NextButton onClick={execute} variant="secondary">Erneut versuchen</NextButton>
          <NextButton onClick={() => onNext(`${step.protocol} ${step.action} skip (${errMsg})`)}>Trotzdem weiter</NextButton>
        </>
      )}
    </>
  )
}

function ZaehlerView({ step, onNext }: { step: Extract<Step, { type: 'zaehler' }>; onNext: Props['onNext'] }) {
  return (
    <>
      <p className="step-text">
        Zaehler <strong>{step.variable}</strong> wird um {step.increment} erhoeht.
      </p>
      <NextButton onClick={() => onNext(`${step.variable} +${step.increment}`)}>Weiter</NextButton>
    </>
  )
}

function TimerView({ step, onNext }: { step: Extract<Step, { type: 'timer' }>; onNext: Props['onNext'] }) {
  const [remaining, setRemaining] = useState(step.seconds)
  useEffect(() => {
    if (remaining <= 0) return
    const t = setTimeout(() => setRemaining((r) => r - 1), 1000)
    return () => clearTimeout(t)
  }, [remaining])
  return (
    <>
      <p className="step-text">{step.message}</p>
      <div className="timer-display">{remaining}s</div>
      <NextButton
        onClick={() => onNext(`Timer abgelaufen (${step.seconds}s)`)}
        disabled={remaining > 0}
      >
        {remaining > 0 ? `Bitte warten (${remaining}s)` : 'Weiter'}
      </NextButton>
    </>
  )
}

function FeedbackView({ step, onNext }: { step: Extract<Step, { type: 'feedback' }>; onNext: Props['onNext'] }) {
  const [rating, setRating] = useState<number | null>(null)
  return (
    <>
      <p className="step-text">{step.question}</p>
      <div className="rating-row">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            className={`rating-btn ${rating === n ? 'selected' : ''}`}
            onClick={() => setRating(n)}
          >
            {n}
          </button>
        ))}
      </div>
      <NextButton onClick={() => onNext(`Bewertung: ${rating}/5`)} disabled={rating === null}>
        Abschliessen
      </NextButton>
    </>
  )
}

function NextButton(props: { children: React.ReactNode; onClick: () => void; disabled?: boolean; variant?: 'primary' | 'secondary' }) {
  return (
    <button
      className={`big-btn ${props.variant === 'secondary' ? 'btn-secondary' : 'btn-primary'}`}
      onClick={props.onClick}
      disabled={props.disabled}
    >
      {props.children}
    </button>
  )
}
