import { getAgentMeta } from '../agentMeta'

/**
 * RoutingTrace
 * ─────────────
 * The signature element of SCM Copilot: a thin telemetry strip
 * above each agent reply, exposing the real pipeline decision —
 * which agent answered, which model ran, token cost, and latency.
 */
export default function RoutingTrace({ agentUsed, confidence, meta }) {
  const agent = getAgentMeta(agentUsed)
  const simulated = meta?.simulated
  const model = meta?.model || (simulated ? 'simulation' : '—')
  const tokens = (meta?.inputTokens || 0) + (meta?.outputTokens || 0)
  const duration = meta?.durationMs ? (meta.durationMs / 1000).toFixed(1) : null

  return (
    <div className="trace">
      <span className="trace-avatar">
        <span className="trace-avatar-glyph">{agent.glyph}</span>
      </span>

      <span className="trace-agent">{agent.label}</span>

      <span className="trace-sep">·</span>

      <span className={`trace-item ${simulated ? 'is-simulated' : 'is-live'}`}>
        {simulated ? 'simulated' : model}
      </span>

      {!simulated && tokens > 0 && (
        <>
          <span className="trace-sep">·</span>
          <span className="trace-item">{tokens.toLocaleString()} tok</span>
        </>
      )}

      {duration && (
        <>
          <span className="trace-sep">·</span>
          <span className="trace-item">{duration}s</span>
        </>
      )}

      {confidence && (
        <>
          <span className="trace-sep">·</span>
          <span className="trace-item trace-confidence">{confidence.toLowerCase()} confidence</span>
        </>
      )}
    </div>
  )
}