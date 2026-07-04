'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * InvestmentCalculator — extracted from app/page.js
 * Self-contained component with its own state for amount, duration, and view.
 * Props:
 *   initialAmount   {number}  — preselected capital amount (from page.js state)
 *   initialDuration {number}  — preselected duration (from page.js state)
 *   onApplyClick    {fn}      — called when user clicks "Fill SPL Application"
 *   currentUser     {object}  — current logged-in user (or null)
 *   sliderToAmount  {fn}      — utility: slider value → BDT amount
 *   amountToSlider  {fn}      — utility: BDT amount → slider value
 */
export default function InvestmentCalculator({
  initialAmount = 100000,
  initialDuration = 33,
  onApplyClick,
  currentUser,
  sliderToAmount,
  amountToSlider,
}) {
  const [investAmount, setInvestAmount] = useState(initialAmount);
  const [investDuration, setInvestDuration] = useState(33);
  const [calcView, setCalcView] = useState('summary');

  // Sync from parent when parent changes (e.g., via application modal)
  useEffect(() => { setInvestAmount(initialAmount); }, [initialAmount]);

  const principal = Number(investAmount) || 0;
  const monthlyProfit = (principal / 100000) * 3000;
  const monthlyCapital = principal / investDuration;
  const monthlyTotal = monthlyProfit + monthlyCapital;
  const grandTotal = monthlyTotal * investDuration;
  const netProfitTotal = monthlyProfit * investDuration;
  const capitalRefundTotal = monthlyCapital * investDuration;
  const roiPercent = principal > 0 ? (((grandTotal - principal) / principal) * 100).toFixed(1) : 0;

  const formatBDT = (amt) => '৳' + Math.round(Number(amt)).toLocaleString('en-IN');

  return (
    <section className="investment-section section-padding bg-dark text-white" id="investment">
      <div className="container">
        
        {/* Notice Bar */}
        <div className="notice-bar mb-5 scroll-reveal" style={{ borderRadius: '12px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '15px 20px', marginBottom: '40px' }}>
          <div className="notice-flex">
            <div className="notice-label text-success" style={{ fontWeight: 700 }}><i className="fa-solid fa-bullhorn text-success"></i> Important Announcement:</div>
            <div className="notice-text text-white">Minimum Investment starting at only ৳10,000! Start your journey towards financial freedom with genuine product-backed businesses.</div>
            <a href="#contact" className="notice-link text-accent" style={{ fontWeight: 700, color: '#ff9f1c' }}>Visit Gazipur Office <i className="fa-solid fa-arrow-right"></i></a>
          </div>
        </div>

        <div className="section-header text-center scroll-reveal">
          <span className="section-subtitle text-accent">Transparent Investment Scheme</span>
          <h2 className="section-title text-white">Dynamic Cashback &amp; Capital Refund Plan</h2>
          <p className="section-desc text-light">Invest safely in halal, product-backed multi-sector ventures with guaranteed monthly payout schedules.</p>
          <div className="title-underline"></div>
        </div>

        <div className="investment-calculator-wrapper">
          <div className="calc-card">
            <div className="calc-header">
              <div className="calc-header-title">
                <h3><i className="fa-solid fa-calculator text-accent"></i> Interactive Investment Calculator</h3>
                <p>Customize your investment capital and tenure duration to see live real-time projected returns.</p>
              </div>
              <div className="calc-roi-badge">
                <span className="roi-label">Est. Net ROI</span>
                <span className="roi-val">+{roiPercent}%</span>
              </div>
            </div>

            <div className="calc-body">
              {/* Quick Select Chips */}
              <div className="calc-section-box mb-4">
                <label className="input-label mb-2"><i className="fa-solid fa-bolt text-warning"></i> Quick Select Investment Amount:</label>
                <div className="preset-chips-grid">
                  {[25000, 50000, 100000, 500000, 1000000, 2500000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      className={`chip-btn ${investAmount === amt ? 'active' : ''}`}
                      onClick={() => setInvestAmount(amt)}
                    >
                      {amt >= 100000 ? `৳${amt / 100000} Lakh` : `৳${amt.toLocaleString('en-IN')}`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Slider & Input */}
              <div className="form-group mb-4">
                <div className="slider-label-row">
                  <label htmlFor="investAmountRange" className="input-label">Custom Investment Capital (BDT):</label>
                  <span className="min-max-text">Min ৳10,000 — Max ৳1,00,00,000</span>
                </div>
                <div className="amount-display-box">
                  <span className="currency-symbol">৳</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={investAmount === 0 ? '' : investAmount.toLocaleString('en-IN')}
                    className="amount-input"
                    onChange={(e) => {
                      const raw = e.target.value.replace(/[^0-9]/g, '');
                      setInvestAmount(raw === '' ? 0 : Number(raw));
                    }}
                    onBlur={() => {
                      if (investAmount < 10000) setInvestAmount(10000);
                      if (investAmount > 10000000) setInvestAmount(10000000);
                    }}
                  />
                  <div className="amount-formatted-badge">
                    Selected Capital: <strong>{formatBDT(investAmount)}</strong>
                  </div>
                </div>
                <input
                  type="range"
                  id="investAmountRange"
                  min="0"
                  max="100"
                  step="0.1"
                  value={amountToSlider ? amountToSlider(investAmount) : 0}
                  className="slider"
                  onChange={(e) => sliderToAmount && setInvestAmount(sliderToAmount(Number(e.target.value)))}
                />
                <div className="range-labels">
                  <span>৳10,000</span><span>৳1 Lakh</span><span>৳5 Lakh</span><span>৳25 Lakh</span><span>৳1 Crore</span>
                </div>
              </div>



              {/* View Tabs */}
              <div className="calc-nav-tabs mb-4">
                <button type="button" className={`calc-tab-btn ${calcView === 'summary' ? 'active' : ''}`} onClick={() => setCalcView('summary')}>
                  <i className="fa-solid fa-chart-pie"></i> Return Summary Overview
                </button>
                <button type="button" className={`calc-tab-btn ${calcView === 'schedule' ? 'active' : ''}`} onClick={() => setCalcView('schedule')}>
                  <i className="fa-solid fa-table-list"></i> Monthly Payout Timeline
                </button>
              </div>

              {calcView === 'summary' ? (
                <>
                  <div className="ratio-bar-box mb-4">
                    <div className="ratio-labels">
                      <span><i className="fa-solid fa-circle text-accent"></i> Net Profit Yield (3%/mo)</span>
                      <span><i className="fa-solid fa-circle text-info"></i> Capital Return ({(100 / investDuration).toFixed(1)}%/mo)</span>
                    </div>
                    <div className="ratio-progress-track">
                      <div className="ratio-segment bg-accent" style={{ width: `${(netProfitTotal / grandTotal) * 100}%` }}></div>
                      <div className="ratio-segment bg-info" style={{ width: `${(capitalRefundTotal / grandTotal) * 100}%` }}></div>
                    </div>
                  </div>
                  <div className="calc-results-grid">
                    <div className="calc-res-box">
                      <span className="res-label">Monthly Profit (মাসিক লভ্যাংশ)</span>
                      <span className="res-value text-accent">{formatBDT(monthlyProfit)}</span>
                      <small className="text-light">3% per month guaranteed yield</small>
                    </div>
                    <div className="calc-res-box highlight-box accent-border">
                      <span className="res-label">Total Net Profit ({investDuration} Months)</span>
                      <span className="res-value text-warning">{formatBDT(netProfitTotal)}</span>
                      <small className="text-light">Total pure profit over full term ({roiPercent}% ROI)</small>
                    </div>
                    <div className="calc-res-box">
                      <span className="res-label">Monthly Capital Refund</span>
                      <span className="res-value text-info">{formatBDT(monthlyCapital)}</span>
                      <small className="text-light">Equal split across {investDuration} months</small>
                    </div>
                    <div className="calc-res-box highlight-box">
                      <span className="res-label">Total Monthly Bank Payout</span>
                      <span className="res-value text-success">{formatBDT(monthlyTotal)}</span>
                      <small className="text-white">Monthly Profit + Capital Refund</small>
                    </div>
                    <div className="calc-res-box highlight-box accent-bg span-full">
                      <span className="res-label">Grand Total Return ({investDuration} Months)</span>
                      <span className="res-value text-dark">{formatBDT(grandTotal)}</span>
                      <small className="text-dark font-semibold">
                        Capital Returned ({formatBDT(capitalRefundTotal)}) + Pure Profit ({formatBDT(netProfitTotal)})
                      </small>
                    </div>
                  </div>
                </>
              ) : (
                <div className="schedule-table-wrapper mb-4">
                  <div className="table-responsive">
                    <table className="schedule-table">
                      <thead>
                        <tr>
                          <th>Month</th><th>Monthly Profit</th><th>Capital Refund</th>
                          <th>Total Monthly Payout</th><th>Cumulative Payout</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[1, 2, 3, 6, 12, 18, 24, 30, investDuration]
                          .filter((m, i, arr) => m <= investDuration && arr.indexOf(m) === i)
                          .map((m) => (
                            <tr key={m} className={m === investDuration ? 'final-row' : ''}>
                              <td><strong>Month {m}</strong> {m === investDuration ? '(Term End)' : ''}</td>
                              <td className="text-accent">{formatBDT(monthlyProfit)}</td>
                              <td className="text-info">{formatBDT(monthlyCapital)}</td>
                              <td className="text-success font-bold">{formatBDT(monthlyTotal)}</td>
                              <td className="font-bold">{formatBDT(monthlyTotal * m)}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="table-note mt-2 text-center text-muted"><small>* Preview showing key milestones over the selected {investDuration}-month duration.</small></p>
                </div>
              )}

              <div className="calc-footer-note mt-4">
                <p><i className="fa-solid fa-shield-halal text-success"></i> <strong>Halal Business Commitment:</strong> Profit distribution is generated from real operational sales in fisheries, consumer appliances, and agriculture. Payout begins exactly 30 days after investment confirmation.</p>
                <div className="text-center mt-3">
                  <button className="btn btn-lg btn-accent calc-apply-btn" onClick={() => onApplyClick && onApplyClick(investAmount, investDuration)}>
                    <i className="fa-solid fa-file-signature"></i> Fill Up SPL Investment Application Form ({formatBDT(principal)} for {investDuration} Mos)
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
