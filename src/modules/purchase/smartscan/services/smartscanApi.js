// ============================================
// SmartScan API Service
// Thin wrappers around the two scan endpoints.
// ============================================

import api from '../../../../services/api.js';

export const smartScanAPI = {
    /**
     * Upload invoice files for async OCR processing.
     * @param {File[]} files  - Array of browser File objects
     * @param {AbortSignal} [signal] - Optional AbortController signal for timeout/cancellation
     * @returns {Promise<{ jobId: string, status: string }>}
     */
    upload(files, signal) {
        const formData = new FormData();
        const fileArray = Array.isArray(files) ? files : [files];
        fileArray.forEach(f => {
            formData.append('files', f);
        });
        return api.post('/purchases/scan', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            signal, // forwards the AbortController signal for timeout support
        });
    },

    /**
     * Poll the status of a scan job.
     * @param {string} jobId
     * @returns {Promise<{ status: 'queued'|'processing'|'completed'|'failed', result?, error? }>}
     */
    getStatus(jobId) {
        return api.get(`/purchases/scan-status/${jobId}`);
    },
};

export default smartScanAPI;
