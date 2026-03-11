/**
 * Resolves a range string into startDate and endDate.
 * @param {string} range - today, yesterday, 7d, 30d, month, custom
 * @returns {{startDate: string, endDate: string}}
 */
export const resolveDateRange = (range) => {
    // FIX: 'custom' was previously falling through to the default case which
    // returned empty strings ''. This overwrote the user's manual date inputs
    // every time the component re-rendered or the dateRange state changed.
    // Now 'custom' returns null to signal "don't overwrite the existing dates".
    if (range === 'custom') {
        return null; // Caller must handle null and keep existing custom dates
    }

    const today = new Date();
    today.setHours(23, 59, 59, 999);

    let start = new Date();
    start.setHours(0, 0, 0, 0);

    switch (range) {
        case 'today':
            // start is already today 00:00
            break;
        case 'yesterday':
            start.setDate(start.getDate() - 1);
            today.setDate(today.getDate() - 1);
            today.setHours(23, 59, 59, 999);
            break;
        case '7d':
            start.setDate(start.getDate() - 6);
            break;
        case '30d':
            start.setDate(start.getDate() - 29);
            break;
        case 'month':
            start.setDate(1);
            break;
        default:
            return { startDate: '', endDate: '' };
    }

    return {
        startDate: start.toISOString().split('T')[0],
        endDate: today.toISOString().split('T')[0]
    };
};
