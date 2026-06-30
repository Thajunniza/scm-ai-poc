export default function Header({ user, onUserChange, health }) {
  return (
    <header className="app-header">
      <div className="brand">
        <span className="brand-mark">
          <span className="brand-mark-inner" />
        </span>
        <span className="brand-name">SCM Copilot</span>
      </div>

      <div className="header-right">
        <div className={`health-pill health-pill--${health.status}`}>
          <span className="health-dot" />
          {health.label}
        </div>

        <select
          className="user-select"
          value={user}
          onChange={(e) => onUserChange(e.target.value)}
        >
          <option value="analyst">analyst</option>
          <option value="admin">admin</option>
          <option value="viewer">viewer</option>
        </select>
      </div>
    </header>
  )
}