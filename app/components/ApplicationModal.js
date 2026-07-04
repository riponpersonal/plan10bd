'use client';

import React, { useState } from 'react';

/**
 * ApplicationModal — extracted from app/page.js
 * Handles SPL Investment / Product Buyer account registration.
 * Props:
 *   isOpen          {bool}
 *   onClose         {fn}
 *   investAmount    {number}  — pre-seeded from calculator
 *   investDuration  {number}  — pre-seeded from calculator
 *   selectedProductId {number|null}
 *   showToast       {fn}
 *   formatBDT       {fn}
 */
export default function ApplicationModal({
  isOpen, onClose, investAmount = 100000, investDuration = 33,
  selectedProductId = null, showToast, formatBDT
}) {
  const [appApplicantName, setAppApplicantName] = useState('');
  const [appNid, setAppNid] = useState('');
  const [appFatherName, setAppFatherName] = useState('');
  const [appPhone, setAppPhone] = useState('');
  const [appPassword, setAppPassword] = useState('');
  const [appAddress, setAppAddress] = useState('');
  const [appNomineeName, setAppNomineeName] = useState('');
  const [appRelation, setAppRelation] = useState('');
  const [appPurpose, setAppPurpose] = useState('Investment');
  const [appReferredBy, setAppReferredBy] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Editable Investment details states
  const [appCapitalAmount, setAppCapitalAmount] = useState(investAmount);
  const [appDurationMonths, setAppDurationMonths] = useState(33);

  // Existing member detection
  const [membersList, setMembersList] = useState([]);
  const [applicationsList, setApplicationsList] = useState([]);
  const [isExistingMember, setIsExistingMember] = useState(false);
  const [isAlreadyInvestor, setIsAlreadyInvestor] = useState(false);
  const [loggedInUserIdentifier, setLoggedInUserIdentifier] = useState('');

  const fmt = formatBDT || ((amt) => '৳' + Math.round(Number(amt)).toLocaleString('en-IN'));
  const monthlyProfit = (Number(appCapitalAmount) / 100000) * 3000;
  const monthlyCapital = Number(appCapitalAmount) / 33;

  // Synchronize modal open states
  React.useEffect(() => {
    if (isOpen) {
      setAppCapitalAmount(investAmount);
      setAppDurationMonths(33);
      
      // Auto-populate from logged-in user session
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('plan10_user');
        if (stored) {
          try {
            const userObj = JSON.parse(stored);
            if (userObj) {
              if (userObj.username) {
                setLoggedInUserIdentifier(userObj.username);
              }
              if (userObj.phone) {
                setAppPhone(userObj.phone);
              }
            }
          } catch (e) {
            console.error('Failed to parse stored user', e);
          }
        }
      }

      // Load members to check phone registrations
      fetch('/api/members')
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setMembersList(data.members || []);
          }
        })
        .catch(err => console.error('Failed to load members check list', err));

      // Load applications to check pending phone applications
      fetch('/api/applications')
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setApplicationsList(data.applications || []);
          }
        })
        .catch(err => console.error('Failed to load applications check list', err));
    }
  }, [isOpen, investAmount, investDuration]);

  // Check phone changes and session identity match
  React.useEffect(() => {
    // 1. Search in approved members list
    let memberMatch = null;
    if (loggedInUserIdentifier) {
      memberMatch = membersList.find(m => m.memberId === loggedInUserIdentifier || m.phone === loggedInUserIdentifier);
    }
    if (!memberMatch && appPhone) {
      const cleanPhone = appPhone.replace(/\D/g, '');
      if (cleanPhone.length >= 8) {
        memberMatch = membersList.find(m => {
          if (!m.phone) return false;
          const mDigits = m.phone.replace(/\D/g, '');
          return mDigits.endsWith(cleanPhone) || cleanPhone.endsWith(mDigits);
        });
      }
    }

    // 2. Search in pending/rejected applications list
    let appMatch = null;
    if (!memberMatch) {
      if (appPhone) {
        const cleanPhone = appPhone.replace(/\D/g, '');
        if (cleanPhone.length >= 8) {
          appMatch = applicationsList.find(a => {
            if (!a.phone) return false;
            const aDigits = a.phone.replace(/\D/g, '');
            return aDigits.endsWith(cleanPhone) || cleanPhone.endsWith(aDigits);
          });
        }
      }
    }

    if (memberMatch) {
      setIsExistingMember(true);
      setIsAlreadyInvestor(memberMatch.capitalInvested > 0);
      setAppApplicantName(memberMatch.name || '');
      setAppNid(memberMatch.nid || '');
      setAppAddress(memberMatch.address || '');
      setAppFatherName(memberMatch.fatherName || '');
      setAppNomineeName(memberMatch.nomineeName || '');
      setAppRelation(memberMatch.relation || '');
      if (memberMatch.phone && appPhone !== memberMatch.phone) {
        setAppPhone(memberMatch.phone);
      }
    } else if (appMatch) {
      setIsExistingMember(true);
      setIsAlreadyInvestor(appMatch.purpose === 'Investment');
      setAppApplicantName(appMatch.applicantName || '');
      setAppNid(appMatch.nid || '');
      setAppAddress(appMatch.address || '');
      setAppFatherName(appMatch.fatherName || '');
      setAppNomineeName(appMatch.nomineeName || '');
      setAppRelation(appMatch.relation || '');
      if (appMatch.phone && appPhone !== appMatch.phone) {
        setAppPhone(appMatch.phone);
      }
    } else {
      setIsExistingMember(false);
      setIsAlreadyInvestor(false);
    }
  }, [appPhone, loggedInUserIdentifier, membersList, applicationsList]);

  React.useEffect(() => {
    if (typeof window !== 'undefined' && isOpen) {
      const getQueryParam = (name) => {
        const hash = window.location.hash || '';
        const search = window.location.search || '';
        const queryParams = new URLSearchParams(search || hash.substring(hash.indexOf('?')));
        return queryParams.get(name);
      };
      const ref = getQueryParam('ref');
      if (ref) {
        setAppReferredBy(ref);
      }
    }
  }, [isOpen]);

  const resetForm = () => {
    setAppApplicantName(''); setAppNid(''); setAppFatherName('');
    setAppPhone(''); setAppPassword(''); setAppAddress('');
    setAppNomineeName(''); setAppRelation(''); setAppPurpose('Investment');
    setAppReferredBy('');
    setIsExistingMember(false);
    setIsAlreadyInvestor(false);
  };

  const handleClose = () => { resetForm(); onClose(); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicantName: appApplicantName,
          nid: appNid,
          fatherName: appFatherName,
          phone: appPhone,
          password: isExistingMember ? '' : appPassword,
          address: appAddress,
          capitalAmount: appPurpose === 'Investment' ? Number(appCapitalAmount) : 0,
          durationMonths: appPurpose === 'Investment' ? Number(appDurationMonths) : 0,
          nomineeName: appNomineeName,
          relation: appRelation,
          purpose: appPurpose,
          productId: appPurpose === 'Buy Product' ? selectedProductId : null,
          referredBy: appReferredBy
        })
      });
      const data = await res.json();
      setIsSubmitting(false);
      if (data.success) {
        handleClose();
        const msg = appPurpose === 'Buy Product'
          ? 'Account created and product order placed! Your account will be active once the admin accepts your order.'
          : 'SPL Application submitted successfully! Our Gazipur desk will verify your details.';
        showToast && showToast(msg, 'success');
      } else {
        showToast && showToast(data.message || 'Failed to submit application.', 'error');
      }
    } catch (err) {
      setIsSubmitting(false);
      showToast && showToast('Server error while submitting application.', 'error');
    }
  };

  return (
    <div className={`modal-backdrop ${isOpen ? 'active' : ''}`}>
      <div className="modal-content large-modal">
        <div className="modal-header">
          <h3><i className="fa-solid fa-file-contract"></i> PLAN-10 BD (PVT). LTD - SPL Investment Application</h3>
          <button className="modal-close" onClick={handleClose}>&times;</button>
        </div>
        <div className="modal-body">
          <form onSubmit={handleSubmit}>
            <div className="form-section-title">1. Applicant Details (আবেদনকারীর তথ্য)</div>

            <div className="form-group mb-3" style={{ padding: '0 15px' }}>
              <label style={{ fontWeight: 'bold', color: '#10b981' }}>Account Type / Purpose (নিবন্ধনের উদ্দেশ্য) *</label>
              <select
                className="form-control"
                style={{ background: '#1e293b', color: '#fff', border: '1px solid #475569', borderRadius: '8px', padding: '10px' }}
                value={appPurpose}
                onChange={(e) => setAppPurpose(e.target.value)}
                disabled={isExistingMember}
                required
              >
                <option value="Investment">Investment Account (বিনিয়োগকারী একাউন্ট)</option>
                <option value="Buy Product">Product Buyer Account (পণ্য ক্রেতা একাউন্ট)</option>
              </select>
            </div>

            {isExistingMember && isAlreadyInvestor && appPurpose === 'Investment' && (
              <div style={{
                padding: '12px 16px',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '8px',
                color: '#f87171',
                fontSize: '0.85rem',
                fontWeight: 600,
                marginBottom: '20px',
                marginRight: '15px',
                marginLeft: '15px'
              }}>
                <i className="fa-solid fa-circle-exclamation text-danger"></i> You are already an Investor. If you wish to invest more, please contact the office.
              </div>
            )}

            {isExistingMember && (!isAlreadyInvestor || appPurpose !== 'Investment') && (
              <div style={{
                padding: '12px 16px',
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: '8px',
                color: '#34d399',
                fontSize: '0.85rem',
                fontWeight: 600,
                marginBottom: '20px',
                marginRight: '15px',
                marginLeft: '15px'
              }}>
                <i className="fa-solid fa-circle-check"></i> Plan-10 Member Account Detected! You are already registered under this mobile number. You only need to specify your {appPurpose === 'Investment' ? 'Investment Capital Amount' : 'Product Order'} below.
              </div>
            )}

            <div className="form-row">
              <div className="form-group col-6">
                <label>Applicant Name (আবেদনকারীর নাম) *</label>
                <input type="text" className="form-control" required placeholder="Full Name" disabled={isExistingMember}
                  value={appApplicantName} onChange={(e) => setAppApplicantName(e.target.value)} />
              </div>
              <div className="form-group col-6">
                <label>National ID / Passport No (জাতীয় পরিচয়পত্র নং) *</label>
                <input type="text" className="form-control" required placeholder="NID Number" disabled={isExistingMember}
                  value={appNid} onChange={(e) => setAppNid(e.target.value)} />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group col-6">
                <label>Father&apos;s / Husband&apos;s Name (পিতা/স্বামীর নাম)</label>
                <input type="text" className="form-control" placeholder="Name" disabled={isExistingMember}
                  value={appFatherName} onChange={(e) => setAppFatherName(e.target.value)} />
              </div>
              <div className="form-group col-6">
                <label>Mobile Number (মোবাইল নম্বর) *</label>
                <input type="tel" className="form-control" required placeholder="017XXXXXXXX" disabled={isExistingMember}
                  value={appPhone} onChange={(e) => setAppPhone(e.target.value)} />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group col-6">
                <label>Account Password (একাউন্ট পাসওয়ার্ড) *</label>
                <input type="password" className="form-control" required={!isExistingMember} placeholder={isExistingMember ? "Disabled - Account pre-existing" : "Set Portal Password"} disabled={isExistingMember}
                  value={appPassword} onChange={(e) => setAppPassword(e.target.value)} />
              </div>
              <div className="form-group col-6">
                <label>Present &amp; Permanent Address (বর্তমান ও স্থায়ী ঠিকানা)</label>
                <input type="text" className="form-control" placeholder="Full Address" disabled={isExistingMember}
                  value={appAddress} onChange={(e) => setAppAddress(e.target.value)} />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group col-12" style={{ padding: '0 15px' }}>
                <label>Referral Sponsor ID / Code (ঐচ্ছিক রেফারেল কোড)</label>
                <input type="text" className="form-control" placeholder="e.g. Plan10-101" disabled={isExistingMember}
                  style={{ background: '#1e293b', color: '#fff', border: '1px solid #475569', borderRadius: '8px', padding: '10px' }}
                  value={appReferredBy} onChange={(e) => setAppReferredBy(e.target.value)} />
                <small style={{ color: '#94a3b8', display: 'block', marginTop: '4px' }}>
                  If you joined via a referral link, this field is auto-populated. You will receive direct network tree placement.
                </small>
              </div>
            </div>

            {appPurpose === 'Investment' && (
              <>
                <div className="form-section-title mt-4">2. Investment Scheme Details (বিনিয়োগের পরিমাণ ও বিবরণ)</div>
                <div className="form-row">
                  <div className="form-group col-6">
                    <label>Investment Capital Amount (বিনিয়োগের পরিমাণ ৳) *</label>
                    <input 
                      type="number" 
                      className="form-control" 
                      style={{ background: '#1e293b', color: '#fff', border: '1px solid #475569', borderRadius: '8px', padding: '10px' }}
                      value={appCapitalAmount} 
                      onChange={(e) => setAppCapitalAmount(Number(e.target.value))} 
                      required 
                    />
                  </div>
                  <div className="form-group col-6">
                    <label>Term Duration (মেয়াদ)</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      style={{ background: '#1e293b', color: '#94a3b8', border: '1px solid #475569', borderRadius: '8px', padding: '10px' }}
                      value="33 Months (33 মাস)" 
                      readOnly 
                      disabled
                    />
                  </div>
                </div>
                <div className="summary-box-modal bg-light p-3 rounded mb-3">
                  <div className="form-row">
                    <div className="col-6"><strong>Estimated Monthly Profit:</strong> <span className="text-success">{fmt(monthlyProfit)}</span></div>
                    <div className="col-6"><strong>Estimated Monthly Refund:</strong> <span className="text-info">{fmt(monthlyCapital)}</span></div>
                  </div>
                </div>
              </>
            )}

            <div className="form-section-title mt-4">3. Nominee Information (নমিনীর তথ্য)</div>
            <div className="form-row">
              <div className="form-group col-6">
                <label>Nominee Name (নমিনীর নাম)</label>
                <input type="text" className="form-control" placeholder="Nominee Full Name" disabled={isExistingMember}
                  value={appNomineeName} onChange={(e) => setAppNomineeName(e.target.value)} />
              </div>
              <div className="form-group col-6">
                <label>Relation with Applicant (সম্পর্ক)</label>
                <input type="text" className="form-control" placeholder="e.g. Spouse / Son / Brother" disabled={isExistingMember}
                  value={appRelation} onChange={(e) => setAppRelation(e.target.value)} />
              </div>
            </div>

            <div className="modal-footer mt-4">
              <button type="button" className="btn btn-secondary" onClick={handleClose}>Cancel</button>
              <button 
                type="submit" 
                className="btn btn-primary" 
                disabled={isSubmitting || (isAlreadyInvestor && appPurpose === 'Investment')}
              >
                {isAlreadyInvestor && appPurpose === 'Investment' ? (
                  <>
                    <i className="fa-solid fa-ban"></i> Already an Investor
                  </>
                ) : (
                  <>
                    <i className={`fa-solid ${isSubmitting ? 'fa-spinner fa-spin' : 'fa-check-circle'}`}></i>{' '}
                    {isSubmitting ? 'Submitting...' : 'Submit Application Form'}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
