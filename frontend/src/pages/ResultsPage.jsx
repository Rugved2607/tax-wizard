import './ResultsPage.css'

const fmt = (n) => n?.toLocaleString('en-IN') ?? '0'

export default function ResultsPage({ data, onReset }) {
  const { fields, gaps, regime, ai, total_missed_deductions, estimated_extra_savings } = data
  const better    = regime?.better_regime
  const oldTax    = regime?.old_regime?.tax_payable ?? 0
  const newTax    = regime?.new_regime?.tax_payable ?? 0
  const savings   = regime?.savings ?? 0
  const missedGaps = gaps?.filter(g => typeof g.missed === 'number' && g.missed > 0) ?? []

  return (
    <div className="results-page">
      {/* Summary hero */}
      <div className="results-hero">
        <div className="rh-left">
          <div className="rh-name">{fields?.employee_name}</div>
          <div className="rh-meta">
            <span className="rh-chip">{fields?.pan}</span>
            <span className="rh-chip">AY {fields?.assessment_year}</span>
            <span className="rh-chip">{fields?.employer_name}</span>
          </div>
        </div>
        <div className="rh-right">
          <div className="rh-savings-label">Potential extra savings</div>
          <div className="rh-savings-num">₹{fmt(estimated_extra_savings)}</div>
          <div className="rh-savings-sub">if all deductions claimed</div>
        </div>
      </div>

      <div className="results-grid">
        {/* Left column */}
        <div className="col-left">

          {/* AI Summary */}
          {ai?.summary && (
            <div className="card ai-card">
              <div className="card-header">
                <span className="card-icon">🤖</span>
                <span className="card-title">AI Analysis</span>
                <span className="ai-badge">Llama 3.3</span>
              </div>
              <p className="ai-summary">{ai.summary}</p>
              {ai.key_insight && (
                <div className="ai-insight">
                  <span className="insight-icon">💡</span>
                  <span>{ai.key_insight}</span>
                </div>
              )}
            </div>
          )}

          {/* Regime comparison */}
          <div className="card regime-card">
            <div className="card-header">
              <span className="card-icon">⚖️</span>
              <span className="card-title">Regime Comparison</span>
            </div>
            <div className="regime-grid">
              <RegimeCol
                label="Old Regime"
                data={regime?.old_regime}
                isBetter={better === 'old'}
                tag="With all deductions"
              />
              <div className="regime-vs">VS</div>
              <RegimeCol
                label="New Regime"
                data={regime?.new_regime}
                isBetter={better === 'new'}
                tag="115BAC · Simpler"
              />
            </div>
            <div className={`regime-verdict ${better}`}>
              {better === 'old' ? '📋' : '🆕'} You save <strong>₹{fmt(savings)}</strong> with the{' '}
              <strong>{better === 'old' ? 'Old' : 'New'} Regime</strong>
            </div>
            {ai?.regime_advice && (
              <p className="regime-advice">{ai.regime_advice}</p>
            )}
          </div>

          {/* Top actions */}
          {ai?.top_actions?.length > 0 && (
            <div className="card actions-card">
              <div className="card-header">
                <span className="card-icon">🎯</span>
                <span className="card-title">Action Plan</span>
              </div>
              <div className="actions-list">
                {ai.top_actions.map((a, i) => (
                  <div key={i} className={`action-item priority-${a.priority?.toLowerCase()}`}>
                    <div className="action-top">
                      <span className={`priority-dot ${a.priority?.toLowerCase()}`} />
                      <span className="action-text">{a.action}</span>
                    </div>
                    <div className="action-impact">{a.impact}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="col-right">

          {/* Missed deductions */}
          <div className="card gaps-card">
            <div className="card-header">
              <span className="card-icon">🔍</span>
              <span className="card-title">Missed Deductions</span>
              {missedGaps.length > 0 && (
                <span className="gaps-total">₹{fmt(total_missed_deductions)} unclaimed</span>
              )}
            </div>
            {missedGaps.length === 0 ? (
              <div className="gaps-empty">
                <span>✅</span>
                <span>All deductions fully utilized!</span>
              </div>
            ) : (
              <div className="gaps-list">
                {missedGaps.map((g, i) => {
                  const pct = Math.round((g.claimed / g.limit) * 100)
                  return (
                    <div key={i} className="gap-item" style={{ animationDelay: `${i * 0.07}s` }}>
                      <div className="gap-top">
                        <span className="gap-name">{g.name}</span>
                        <span className="gap-missed">-₹{fmt(g.missed)}</span>
                      </div>
                      <div className="gap-bar-wrap">
                        <div
                          className="gap-bar"
                          style={{ '--target-w': `${pct}%`, width: `${pct}%` }}
                        />
                      </div>
                      <div className="gap-meta">
                        <span>Claimed ₹{fmt(g.claimed)}</span>
                        <span>Limit ₹{fmt(g.limit)}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Investment suggestions */}
          {ai?.investment_suggestions?.length > 0 && (
            <div className="card invest-card">
              <div className="card-header">
                <span className="card-icon">💰</span>
                <span className="card-title">Recommended Investments</span>
              </div>
              <div className="invest-list">
                {ai.investment_suggestions.map((inv, i) => (
                  <div key={i} className="invest-item">
                    <div className="invest-top">
                      <span className="invest-name">{inv.instrument}</span>
                      <span className="invest-section">{inv.section}</span>
                    </div>
                    <div className="invest-benefit">Max benefit: {inv.max_benefit}</div>
                    <div className="invest-why">{inv.why}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Salary breakdown */}
          <div className="card breakdown-card">
            <div className="card-header">
              <span className="card-icon">📊</span>
              <span className="card-title">Salary Breakdown</span>
            </div>
            <div className="breakdown-list">
              {[
                { label: 'Gross Salary',       val: fields?.gross_salary,       type: 'income' },
                { label: 'HRA Exemption',       val: -fields?.hra_exemption,     type: 'deduct' },
                { label: 'Standard Deduction',  val: -fields?.standard_deduction,type: 'deduct' },
                { label: 'Professional Tax',    val: -fields?.professional_tax,  type: 'deduct' },
                { label: 'Taxable Income',      val: fields?.taxable_income || regime?.old_regime?.taxable_income, type: 'total' },
              ].map((r, i) => (
                <div key={i} className={`breakdown-row ${r.type}`}>
                  <span>{r.label}</span>
                  <span className="mono">
                    {r.val < 0 ? '-' : ''}₹{fmt(Math.abs(r.val || 0))}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <button className="reset-btn" onClick={onReset}>
            Analyze Another Form 16
          </button>
        </div>
      </div>
    </div>
  )
}

function RegimeCol({ label, data, isBetter, tag }) {
  return (
    <div className={`regime-col ${isBetter ? 'better' : ''}`}>
      {isBetter && <div className="better-badge">✓ RECOMMENDED</div>}
      <div className="rc-label">{label}</div>
      <div className="rc-tag">{tag}</div>
      <div className="rc-tax">₹{fmt(data?.tax_payable)}</div>
      <div className="rc-tax-label">total tax</div>
      <div className="rc-rows">
        <div className="rc-row">
          <span>Gross</span>
          <span>₹{fmt(data?.gross_salary)}</span>
        </div>
        <div className="rc-row">
          <span>Deductions</span>
          <span>-₹{fmt(data?.total_deductions)}</span>
        </div>
        <div className="rc-row">
          <span>Taxable</span>
          <span>₹{fmt(data?.taxable_income)}</span>
        </div>
      </div>
    </div>
  )
}
