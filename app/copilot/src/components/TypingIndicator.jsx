export default function TypingIndicator({ label = 'Copilot' }) {
  return (
    <div className="msg-row msg-row--agent">
      <div className="bubble bubble--agent bubble--typing">
        <div className="typing-label">{label} is thinking</div>
        <div className="typing-dots">
          <span /><span /><span />
        </div>
      </div>
    </div>
  )
}