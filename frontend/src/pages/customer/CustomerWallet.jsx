import React, { useEffect, useState } from 'react';
import api from '../../api/axiosInstance';
import { useNotification } from '../../context/NotificationContext';
import { Wallet, Plus, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import '../../styles/design-system.css';
import '../../styles/enhanced-styles.css';

const CustomerWallet = () => {
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const { showNotification } = useNotification();

  const loadWallet = async () => {
    try {
      const res = await api.get('/wallet');
      if (res.data.success && res.data.wallet) {
        setBalance(res.data.wallet.balance || 0);
        setTransactions(res.data.wallet.transactions || []);
      }
    } catch (err) {
      console.error('Error loading wallet details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWallet();
  }, []);

  const handleAddMoney = async (e) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      showNotification('Please enter a valid amount', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post('/wallet/add-money', { amount: parsedAmount });
      if (res.data.success) {
        showNotification(`Successfully added ₹${parsedAmount} to wallet`, 'success');
        setAmount('');
        loadWallet();
      } else {
        showNotification(res.data.message || 'Failed to add funds', 'error');
      }
    } catch (err) {
      console.error('Add money error:', err);
      showNotification('An error occurred. Please try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container" style={{ padding: '32px 24px', minHeight: '80vh' }}>
      <h1 style={{ fontSize: '28px', fontWeight: '800', marginBottom: '24px' }}>My Wallet</h1>

      {loading ? (
        <div className="loading" style={{ height: '200px' }}>Loading wallet...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '32px', alignItems: 'flex-start' }}>
          {/* Card containing current balance and add money form */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="card" style={{ padding: '32px 24px', background: 'var(--primary-color)', color: 'white', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'relative', zIndex: 2 }}>
                <Wallet size={32} style={{ opacity: 0.8, marginBottom: '16px' }} />
                <span style={{ fontSize: '14px', fontWeight: '600', opacity: 0.9, textTransform: 'uppercase', letterSpacing: '1px' }}>
                  Total Balance
                </span>
                <h2 style={{ fontSize: '36px', fontWeight: '900', marginTop: '8px' }}>₹{balance.toFixed(2)}</h2>
              </div>
              <div style={{
                position: 'absolute',
                right: '-30px',
                bottom: '-30px',
                width: '150px',
                height: '150px',
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.08)',
                zIndex: 1
              }} />
            </div>

            {/* Deposit Form */}
            <div className="card" style={{ padding: '24px', background: 'white' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '16px' }}>Add Funds</h3>
              <form onSubmit={handleAddMoney} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label htmlFor="amount">Amount (₹)</label>
                  <input
                    id="amount"
                    type="number"
                    placeholder="Enter amount to add"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                  />
                </div>
                
                {/* Popular amounts tags */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  {[100, 500, 1000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      className="btn-outline btn-sm"
                      onClick={() => setAmount(amt.toString())}
                      style={{ padding: '6px 12px', fontSize: '12px' }}
                    >
                      +₹{amt}
                    </button>
                  ))}
                </div>

                <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '8px' }} disabled={submitting}>
                  {submitting ? 'Processing...' : 'Deposit Funds'}
                </button>
              </form>
            </div>
          </div>

          {/* Card containing Transaction Logs */}
          <div className="card" style={{ padding: '24px', background: 'white', minHeight: '400px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
              Transaction History
            </h3>

            {transactions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '64px', color: 'var(--text-muted)' }}>
                No transactions recorded yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {transactions.map((tx) => (
                  <div key={tx.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--bg-secondary)', paddingBottom: '12px' }}>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <div style={{
                        background: tx.type === 'credit' ? '#e6fffa' : '#fff5f5',
                        color: tx.type === 'credit' ? 'var(--success)' : 'var(--danger)',
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        {tx.type === 'credit' ? <ArrowUpRight size={18} /> : <ArrowDownLeft size={18} />}
                      </div>
                      <div>
                        <span style={{ fontWeight: '700', fontSize: '15px', display: 'block' }}>{tx.description}</span>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          {new Date(tx.createdAt).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <span style={{
                      fontWeight: '800',
                      fontSize: '16px',
                      color: tx.type === 'credit' ? 'var(--success)' : 'var(--danger)'
                    }}>
                      {tx.type === 'credit' ? '+' : '-'}₹{tx.amount.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerWallet;
