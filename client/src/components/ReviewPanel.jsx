import ReactMarkdown from 'react-markdown'

export default function ReviewPanel({ result, loading, onClose }) {
  if (!loading && !result) return null

  return (
    <div style={styles.overlay}>
      <div style={styles.panel}>

        {/* Header */}
        <div style={styles.header}>
          <div>
            <div style={styles.title}>Review</div>
            {result && (
              <div style={styles.description}>{result.description}</div>
            )}
          </div>
          <button onClick={onClose} style={styles.closeBtn}>✕</button>
        </div>

        {/* Loading state */}
        {loading && (
          <div style={styles.loading}>
            <div style={styles.spinner} />
            <div style={styles.loadingText}>
              Analyzing your architecture...
            </div>
            <div style={styles.loadingSubtext}>
              Searching real engineering sources
            </div>
          </div>
        )}

        {/* Suggestions */}
        {result && !loading && (
          <div style={styles.suggestions}>
            <div style={styles.sectionLabel}>
              {result.sources?.length} sources
            </div>

            <div style={styles.suggestionText}>
              <ReactMarkdown>{result.suggestions}</ReactMarkdown>
            </div>

            {/* Sources */}
            <div style={styles.sourcesSection}>
              <div style={styles.sectionLabel}>Sources</div>
              {result.sources?.map((source, i) => (
                <a
                key={i}
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                style={styles.sourceLink}
                 >
    <span style={styles.sourceNum}>{i + 1}</span>
    {source.title}
  </a>
))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    right: 0,
    bottom: 0,
    width: '420px',
    zIndex: 2000,
    display: 'flex',
    flexDirection: 'column',
  },
  panel: {
    height: '100%',
    background: '#111111',
    borderLeft: '1px solid #2a2a2a',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    padding: '20px 24px',
    borderBottom: '1px solid #2a2a2a',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexShrink: 0,
  },
  title: {
    color: '#ffffff',
    fontSize: '16px',
    fontWeight: '700',
    fontFamily: 'monospace',
    marginBottom: '4px',
  },
  description: {
    color: '#888',
    fontSize: '12px',
    lineHeight: '1.4',
    maxWidth: '300px',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: '#666',
    fontSize: '18px',
    cursor: 'pointer',
    padding: '4px',
    lineHeight: 1,
  },
  loading: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px',
  },
  spinner: {
    width: '32px',
    height: '32px',
    border: '3px solid #2a2a2a',
    borderTop: '3px solid #2563eb',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  loadingText: {
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: '600',
  },
  loadingSubtext: {
    color: '#666',
    fontSize: '12px',
  },
  suggestions: {
    flex: 1,
    overflowY: 'auto',
    padding: '20px 24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  sectionLabel: {
    color: '#666',
    fontSize: '11px',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    fontWeight: '600',
  },
  suggestionText: {
    color: '#d4d4d4',
    fontSize: '13px',
    lineHeight: '1.7',
    whiteSpace: 'pre-wrap',
  },
  sourcesSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    borderTop: '1px solid #2a2a2a',
    paddingTop: '16px',
  },
  sourceLink: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '8px',
    color: '#2563eb',
    fontSize: '12px',
    textDecoration: 'none',
    lineHeight: '1.4',
    padding: '8px',
    borderRadius: '6px',
    background: '#1a1a1a',
    transition: 'background 0.1s',
  },
  sourceNum: {
    background: '#2563eb',
    color: 'white',
    borderRadius: '4px',
    padding: '1px 6px',
    fontSize: '10px',
    fontWeight: '700',
    flexShrink: 0,
  },
}