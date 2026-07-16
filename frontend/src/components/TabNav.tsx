type TabId = 'pipeline' | 'health' | 'audit';

interface Props {
  active: TabId;
  onChange: (tab: TabId) => void;
  anyFault: boolean;
}

export function TabNav({ active, onChange, anyFault }: Props) {
  const tabs: { id: TabId; label: string; icon: React.ReactNode; desc: string }[] = [
    {
      id: 'pipeline',
      label: 'Interactive Pipeline',
      desc: 'Inject faults and watch the pipeline react',
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="13,2 3,14 12,14 11,22 21,10 12,10 13,2" />
        </svg>
      ),
    },
    {
      id: 'health',
      label: 'Health Monitoring',
      desc: 'Four independent fault state checks',
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      ),
    },
    {
      id: 'audit',
      label: 'System Audit Log',
      desc: 'Timestamped fault transition history',
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="22,12 18,12 15,21 9,3 6,12 2,12" />
        </svg>
      ),
    },
  ];

  return (
    <nav className="tab-nav">
      <div className="tab-nav-inner">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`tab-btn ${active === tab.id ? 'active' : ''}`}
            onClick={() => onChange(tab.id)}
            id={`tab-${tab.id}`}
          >
            <span className={`tab-btn-icon ${active === tab.id ? 'active' : ''}`}>
              {tab.icon}
            </span>
            <span className="tab-btn-label">{tab.label}</span>
            {tab.id === 'health' && anyFault && (
              <span className="tab-fault-dot" />
            )}
          </button>
        ))}
      </div>
    </nav>
  );
}
