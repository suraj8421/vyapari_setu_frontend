/**
 * Converts a numeric amount to English words in the Indian numbering system (Lakhs, Crores).
 * @param {number} amount - The amount to convert.
 * @returns {string} - The string representation in words.
 */
export function convertNumberToWords(amount) {
    if (amount === null || amount === undefined || isNaN(amount)) return 'Zero Rupees Only';
    const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    function convert(num) {
        const numStr = num.toString();
        if (numStr.length > 9) return 'Overflow';
        let n = ('000000000' + numStr).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
        if (!n) return '';
        let str = '';
        str += Number(n[1]) !== 0 ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'Crore ' : '';
        str += Number(n[2]) !== 0 ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'Lakh ' : '';
        str += Number(n[3]) !== 0 ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'Thousand ' : '';
        str += Number(n[4]) !== 0 ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'Hundred ' : '';
        str += Number(n[5]) !== 0 ? (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) : '';
        return str.trim();
    }

    const value = Math.abs(amount);
    const parts = value.toFixed(2).split('.');
    const rupees = parseInt(parts[0], 10);
    const paise = parseInt(parts[1], 10);

    let result = '';
    if (rupees === 0) {
        result = 'Zero Rupees';
    } else {
        result = convert(rupees) + ' Rupees';
    }

    if (paise > 0) {
        result += ' and ' + convert(paise) + ' Paise';
    }
    result += ' Only';
    
    if (amount < 0) {
        result = 'Negative ' + result;
    }

    return result.replace(/\s+/g, ' ').trim();
}

export default convertNumberToWords;
