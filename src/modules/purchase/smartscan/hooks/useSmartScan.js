// ============================================
// useSmartScan — Polling Hook
//
// Manages the full SmartScan lifecycle:
//   idle → uploading → queued → processing → completed | failed
// ============================================

import { useState, useRef, useCallback } from 'react';
import smartScanAPI from '../services/smartscanApi.js';

const POLL_INTERVAL_MS  = 2000; // Poll every 2 seconds
const MAX_POLL_ATTEMPTS = 90;   // 3 minutes max (90 × 2s)
const MAX_POLL_ERRORS   = 3;    // Allow up to 3 consecutive network errors before failing
const UPLOAD_TIMEOUT_MS = 90000; // 90s max for the initial upload request

/**
 * @typedef {Object} SmartScanState
 * @property {'idle'|'uploading'|'queued'|'processing'|'completed'|'failed'} status
 * @property {string|null} jobId
 * @property {Object|null} result   - Raw AI response on completion
 * @property {string|null} error    - Error message on failure
 * @property {Function} startScan   - Call with a File to begin
 * @property {Function} reset       - Reset back to idle
 */
export function useSmartScan() {
    const [status, setStatus] = useState('idle');
    const [jobId, setJobId]   = useState(null);
    const [result, setResult] = useState(null);
    const [error, setError]   = useState(null);

    const intervalRef      = useRef(null);
    const attemptRef       = useRef(0);
    const pollErrorsRef    = useRef(0); // consecutive network errors during polling

    /** Clear any running poll interval */
    const stopPolling = useCallback(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
        attemptRef.current    = 0;
        pollErrorsRef.current = 0;
    }, []);

    /** Begin polling a known jobId */
    const startPolling = useCallback((id) => {
        stopPolling();

        intervalRef.current = setInterval(async () => {
            attemptRef.current += 1;

            // Safety net — stop if we've been polling too long
            if (attemptRef.current > MAX_POLL_ATTEMPTS) {
                stopPolling();
                setStatus('failed');
                setError('Processing timed out after 3 minutes. Please try again.');
                return;
            }

            try {
                const res = await smartScanAPI.getStatus(id);
                const { status: jobStatus, result: jobResult, error: jobError } = res.data;

                // Reset consecutive error count on any successful response
                pollErrorsRef.current = 0;

                setStatus(jobStatus); // queued | processing | completed | failed

                if (jobStatus === 'completed') {
                    stopPolling();
                    setResult(jobResult);
                } else if (jobStatus === 'failed') {
                    stopPolling();
                    setError(jobError || 'AI processing failed. Please try again.');
                }
            } catch (err) {
                // Allow a few consecutive network errors before giving up
                pollErrorsRef.current += 1;
                console.warn(`[SmartScan] Poll error #${pollErrorsRef.current}:`, err.message);
                if (pollErrorsRef.current >= MAX_POLL_ERRORS) {
                    stopPolling();
                    setStatus('failed');
                    setError('Lost connection while checking scan status. Please try again.');
                }
                // Otherwise: silently retry on the next interval tick
            }
        }, POLL_INTERVAL_MS);
    }, [stopPolling]);

    /**
     * Upload files and start polling.
     * Uses an AbortController to enforce a strict upload timeout so the
     * status can NEVER get permanently stuck on 'uploading'.
     * @param {File[]} files
     */
    const startScan = useCallback(async (files) => {
        stopPolling();
        setStatus('uploading');
        setJobId(null);
        setResult(null);
        setError(null);

        // Abort controller lets us enforce the upload timeout
        const controller = new AbortController();
        const timeoutId  = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS);

        try {
            const res = await smartScanAPI.upload(files, controller.signal);
            clearTimeout(timeoutId);

            const { jobId: newJobId, status: serverStatus, result: serverResult, error: serverError } = res.data;

            // Handle immediate response (Sync Fallback)
            if (serverStatus === 'completed') {
                setStatus('completed');
                setResult(serverResult || null);
                return;
            }

            if (serverStatus === 'failed') {
                setStatus('failed');
                setError(serverError || 'AI processing failed.');
                return;
            }

            // Standard async path: server returned a jobId and status is 'queued'
            if (!newJobId) {
                throw new Error(res.data?.message || 'Server did not return a job ID.');
            }

            setJobId(newJobId);
            setStatus('queued');
            startPolling(newJobId);
        } catch (err) {
            clearTimeout(timeoutId);
            const isTimeout = err.name === 'AbortError' || err.name === 'CanceledError';
            const msg = isTimeout
                ? 'Upload timed out. The file may be too large or the server is slow.'
                : (err.response?.data?.message || err.message || 'Upload failed. Please try again.');
            setStatus('failed');
            setError(msg);
        }
    }, [startPolling, stopPolling]);

    /** Reset everything back to idle */
    const reset = useCallback(() => {
        stopPolling();
        setStatus('idle');
        setJobId(null);
        setResult(null);
        setError(null);
    }, [stopPolling]);

    return { status, jobId, result, error, startScan, reset };
}

export default useSmartScan;
