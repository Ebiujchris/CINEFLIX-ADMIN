import { useState, useEffect } from 'react'
import { X, AlertCircle, Check, Clock, Zap } from 'lucide-react'
import { fetchUserSubscription, activateSubscription, extendSubscription, expireSubscription } from './api'

type Subscription = {
  id: string
  status: string
  expiryDate: string | null
  isActive: boolean
  daysUntilExpiry: number | null
  price: number
  payments: any[]
}

type Props = {
  userId: string
  userName: string
  onClose: () => void
  onUpdate: () => void
}

type Toast = { msg: string; ok: boolean }

export default function SubscriptionModal({ userId, userName, onClose, onUpdate }: Props) {
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toast, setToast] = useState<Toast | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [extendDays, setExtendDays] = useState(30)

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    loadSubscription()
  }, [userId])

  const loadSubscription = async () => {
    setLoading(true)
    try {
      const data = await fetchUserSubscription(userId)
      setSubscription(data)
      setError('')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const handleActivate = async () => {
    setActionLoading(true)
    try {
      await activateSubscription(userId, 30)
      await loadSubscription()
      showToast('Subscription activated for 30 days')
      onUpdate()
    } catch (err) {
      showToast((err as Error).message, false)
    } finally {
      setActionLoading(false)
    }
  }

  const handleExtend = async () => {
    if (extendDays < 1) {
      showToast('Days must be at least 1', false)
      return
    }
    setActionLoading(true)
    try {
      await extendSubscription(userId, extendDays)
      await loadSubscription()
      showToast(`Subscription extended by ${extendDays} days`)
      onUpdate()
      setExtendDays(30)
    } catch (err) {
      showToast((err as Error).message, false)
    } finally {
      setActionLoading(false)
    }
  }

  const handleExpire = async () => {
    if (!confirm('Are you sure you want to expire this subscription?')) return
    setActionLoading(true)
    try {
      await expireSubscription(userId)
      await loadSubscription()
      showToast('Subscription expired')
      onUpdate()
    } catch (err) {
      showToast((err as Error).message, false)
    } finally {
      setActionLoading(false)
    }
  }

  const formatDate = (date: string | null) => {
    if (!date) return 'Never'
    return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Subscription — {userName}</h2>
          <button onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>

        {toast && (
          <div className={`toast ${toast.ok ? 'ok' : 'err'}`}>
            {toast.ok ? <Check size={14} /> : <AlertCircle size={14} />}
            {toast.msg}
          </div>
        )}

        {error && (
          <div className="error-box">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {loading ? (
          <div className="center-state">
            <span className="spinner" />
            <p>Loading subscription...</p>
          </div>
        ) : !subscription ? (
          <div className="center-state">
            <AlertCircle size={32} />
            <p>No subscription data</p>
          </div>
        ) : (
          <>
            {/* Current Status */}
            <div className="sub-info-box">
              <div className="sub-info-item">
                <span className="sub-label">Status</span>
                <span className={`sub-status ${subscription.status.toLowerCase()}`}>
                  {subscription.status}
                </span>
              </div>
              <div className="sub-info-item">
                <span className="sub-label">Price</span>
                <span className="sub-value">{subscription.price.toLocaleString()} UGX/month</span>
              </div>
              <div className="sub-info-item">
                <span className="sub-label">Expiry</span>
                <span className="sub-value">
                  {subscription.expiryDate ? (
                    <>
                      <Clock size={13} style={{ display: 'inline' }} /> {formatDate(subscription.expiryDate)}
                      {subscription.daysUntilExpiry !== null && (
                        <span style={{ color: '#999', marginLeft: '8px' }}>
                          ({subscription.daysUntilExpiry} days remaining)
                        </span>
                      )}
                    </>
                  ) : (
                    'No expiry set'
                  )}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="sub-actions">
              {!subscription.isActive && (
                <button
                  className="btn-action activate"
                  onClick={handleActivate}
                  disabled={actionLoading}
                >
                  {actionLoading ? <span className="spinner sm" /> : <Zap size={14} />}
                  Activate Subscription
                </button>
              )}

              {subscription.isActive && (
                <>
                  <div className="extend-box">
                    <label>
                      Extend by (days)
                      <input
                        type="number"
                        value={extendDays}
                        onChange={(e) => setExtendDays(parseInt(e.target.value) || 1)}
                        min="1"
                        max="365"
                        disabled={actionLoading}
                      />
                    </label>
                    <button
                      className="btn-action extend"
                      onClick={handleExtend}
                      disabled={actionLoading}
                    >
                      {actionLoading ? <span className="spinner sm" /> : <Clock size={14} />}
                      Extend
                    </button>
                  </div>

                  <button
                    className="btn-action danger"
                    onClick={handleExpire}
                    disabled={actionLoading}
                  >
                    {actionLoading ? <span className="spinner sm" /> : <X size={14} />}
                    Expire Subscription
                  </button>
                </>
              )}
            </div>

            {/* Payment History */}
            {subscription.payments.length > 0 && (
              <div className="payment-history">
                <h3>Payment History</h3>
                <div className="payments-list">
                  {subscription.payments.map((payment) => (
                    <div key={payment.id} className="payment-item">
                      <div className="payment-info">
                        <strong>{payment.amount.toLocaleString()} UGX</strong>
                        <span className={`payment-status ${payment.status.toLowerCase()}`}>
                          {payment.status}
                        </span>
                      </div>
                      <span className="payment-date">
                        {new Date(payment.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
