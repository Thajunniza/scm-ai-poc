import { SUGGESTED_PROMPTS, getAgentMeta } from '../agentMeta'

export default function SuggestedPrompts({ onPick }) {
  return (
    <div className="suggestions">
      {SUGGESTED_PROMPTS.map((p) => {
        const agent = getAgentMeta(p.agent)
        return (
          <button
            key={p.text}
            className="suggestion-chip"
            style={{ '--agent-color': agent.color }}
            onClick={() => onPick(p.text)}
          >
            <span className="suggestion-glyph">{agent.glyph}</span>
            {p.text}
          </button>
        )
      })}
    </div>
  )
}