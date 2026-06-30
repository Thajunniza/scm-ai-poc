import RoutingTrace from './RoutingTrace'
import { renderMarkdown } from '../markdown'

export default function MessageBubble({ message }) {
  const { role, text, agentUsed, confidence, meta, sources, isError } = message

  if (role === 'user') {
    return (
      <div className="msg-row msg-row--user">
        <div className="bubble bubble--user">{text}</div>
      </div>
    )
  }

  return (
    <div className="msg-row msg-row--agent">
      <div className={`bubble bubble--agent ${isError ? 'bubble--error' : ''}`}>
        {agentUsed && <RoutingTrace agentUsed={agentUsed} confidence={confidence} meta={meta} />}

        <div
          className="bubble-content"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(text) }}
        />

        {sources && sources.length > 0 && (
          <div className="source-chips">
            {sources.map((s) => (
              <span key={s} className="source-chip">{s}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}