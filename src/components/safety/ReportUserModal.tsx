import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  REPORT_REASON_VALUES,
  submitUserReport,
  blockUser,
  type ReportReason,
} from '../../lib/database';

type Phase = 'form' | 'blockPrompt';

export function ReportUserModal({
  open,
  onClose,
  reporterId,
  reportedId,
  reportedName,
  onAfterBlock,
}: {
  open: boolean;
  onClose: () => void;
  reporterId: string;
  reportedId: string;
  reportedName: string;
  /** Called after user confirms block from the post-report prompt (e.g. navigate away). */
  onAfterBlock?: (reportedUserId: string) => void;
}) {
  const [phase, setPhase] = useState<Phase>('form');
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [blocking, setBlocking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setPhase('form');
    setReason(null);
    setDetails('');
    setSubmitting(false);
    setBlocking(false);
    setError(null);
  }, [open, reportedId]);

  const handleSubmitReport = async () => {
    if (!reason || submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const { error: err } = await submitUserReport(reporterId, reportedId, reason, details || null);
      if (err) {
        setError(err.message || 'Could not send report. Try again.');
        setSubmitting(false);
        return;
      }
      setPhase('blockPrompt');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBlockFromPrompt = async () => {
    if (blocking) return;
    setBlocking(true);
    setError(null);
    try {
      const { error: err } = await blockUser(reporterId, reportedId);
      if (err) {
        setError(err.message || 'Could not block user.');
        setBlocking(false);
        return;
      }
      onClose();
      onAfterBlock?.(reportedId);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setBlocking(false);
    }
  };

  const handleNoBlock = () => {
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-[70]"
            style={{ background: 'rgba(0,0,0,0.75)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !submitting && !blocking && onClose()}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="report-modal-title"
            className="fixed left-1/2 top-1/2 z-[71] w-[calc(100%-40px)] max-w-md max-h-[min(88vh,640px)] flex flex-col rounded-2xl overflow-hidden"
            style={{
              background: '#0E1830',
              border: '2px solid rgba(78,255,196,0.25)',
              boxShadow: '0 12px 48px rgba(0,0,0,0.55)',
              x: '-50%',
              y: '-50%',
            }}
            initial={{ opacity: 0, scale: 0.92, x: '-50%', y: '-50%' }}
            animate={{ opacity: 1, scale: 1, x: '-50%', y: '-50%' }}
            exit={{ opacity: 0, scale: 0.92, x: '-50%', y: '-50%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex-1 overflow-y-auto px-5 pt-5 pb-4">
              {phase === 'form' && (
                <>
                  <h2
                    id="report-modal-title"
                    className="font-display text-xl mb-1 text-center"
                    style={{ color: '#FFE66D' }}
                  >
                    Report {reportedName}
                  </h2>
                  <p className="font-body text-ui-caption text-center mb-4" style={{ color: 'rgba(255,255,255,0.45)' }}>
                    Why are you reporting this profile?
                  </p>
                  <div className="flex flex-col gap-2 mb-4">
                    {REPORT_REASON_VALUES.map((r) => (
                      <label
                        key={r}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer"
                        style={{
                          background: reason === r ? 'rgba(78,255,196,0.1)' : 'rgba(255,255,255,0.04)',
                          border: `1px solid ${reason === r ? 'rgba(78,255,196,0.35)' : 'rgba(255,255,255,0.08)'}`,
                        }}
                      >
                        <input
                          type="radio"
                          name="report-reason"
                          checked={reason === r}
                          onChange={() => setReason(r)}
                          className="accent-[#4EFFC4] shrink-0"
                        />
                        <span className="font-body text-ui-body" style={{ color: 'rgba(255,255,255,0.85)' }}>
                          {r}
                        </span>
                      </label>
                    ))}
                  </div>
                  <label className="block">
                    <span className="font-body text-ui-caption mb-1 block" style={{ color: 'rgba(255,255,255,0.4)' }}>
                      Additional details (optional)
                    </span>
                    <textarea
                      value={details}
                      onChange={(e) => setDetails(e.target.value)}
                      rows={3}
                      maxLength={2000}
                      className="w-full rounded-xl px-3 py-2 font-body text-ui-body resize-none"
                      style={{
                        background: 'rgba(0,0,0,0.35)',
                        border: '1px solid rgba(255,255,255,0.12)',
                        color: 'rgba(255,255,255,0.9)',
                      }}
                      placeholder="Anything else we should know…"
                    />
                  </label>
                </>
              )}

              {phase === 'blockPrompt' && (
                <>
                  <h2 className="font-display text-xl mb-3 text-center" style={{ color: '#4EFFC4' }}>
                    Report sent
                  </h2>
                  <p className="font-body text-ui-body text-center leading-relaxed" style={{ color: 'rgba(255,255,255,0.72)' }}>
                    Do you also want to block {reportedName}?
                  </p>
                </>
              )}

              {error && (
                <p
                  className="font-body text-ui-caption text-center mt-3 rounded-lg px-3 py-2"
                  style={{
                    color: '#FF6BA8',
                    background: 'rgba(255,61,113,0.12)',
                    border: '1px solid rgba(255,61,113,0.3)',
                  }}
                >
                  {error}
                </p>
              )}
            </div>

            <div
              className="flex-none flex flex-col gap-2 px-5 pb-5 pt-2"
              style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}
            >
              {phase === 'form' && (
                <div className="flex gap-3">
                  <motion.button
                    type="button"
                    onClick={() => !submitting && onClose()}
                    className={`flex-1 py-3 rounded-xl font-body text-ui-body font-bold ${submitting ? 'opacity-40 cursor-not-allowed pointer-events-none' : ''}`}
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.14)',
                      color: 'rgba(255,255,255,0.75)',
                    }}
                    whileTap={{ scale: 0.98 }}
                    disabled={submitting}
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    type="button"
                    onClick={() => void handleSubmitReport()}
                    disabled={!reason || submitting}
                    className={`flex-1 py-3 rounded-xl font-body text-ui-body font-bold ${!reason || submitting ? 'opacity-40 cursor-not-allowed pointer-events-none' : ''}`}
                    style={{
                      background: 'linear-gradient(135deg, #4EFFC4 0%, #00D9FF 100%)',
                      border: '2px solid rgba(0,0,0,0.35)',
                      color: '#12122A',
                    }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {submitting ? 'Sending…' : 'Submit report'}
                  </motion.button>
                </div>
              )}

              {phase === 'blockPrompt' && (
                <>
                  <motion.button
                    type="button"
                    onClick={() => void handleBlockFromPrompt()}
                    disabled={blocking}
                    className={`w-full py-3 rounded-xl font-body text-ui-body font-bold ${blocking ? 'opacity-40 cursor-not-allowed pointer-events-none' : ''}`}
                    style={{
                      background: 'rgba(255,61,113,0.18)',
                      border: '1px solid rgba(255,61,113,0.45)',
                      color: '#FF6BA8',
                    }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {blocking ? 'Blocking…' : 'Yes, block them'}
                  </motion.button>
                  <motion.button
                    type="button"
                    onClick={handleNoBlock}
                    disabled={blocking}
                    className={`w-full py-3 rounded-xl font-body text-ui-body font-bold ${blocking ? 'opacity-40 cursor-not-allowed pointer-events-none' : ''}`}
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      color: 'rgba(255,255,255,0.75)',
                    }}
                    whileTap={{ scale: 0.98 }}
                  >
                    No thanks
                  </motion.button>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
