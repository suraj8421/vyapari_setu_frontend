/**
 * Resolves a range string into startDate and endDate
 * @param {string} range - today, yesterday, 7d, 30d, month
 * @returns {{startDate: string, endDate: string}}
 */
export const resolveDateRange = (range) => {
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
