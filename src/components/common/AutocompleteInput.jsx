import React, { useState, useEffect, useRef } from 'react';
import api from '../../services/api';

export default function AutocompleteInput({
    value = '',
    onChange,
    onSelect,
    endpoint,
    placeholder = 'Search...',
    renderOption,
    className = 'input w-full rounded-xl',
    searchKey = 'search'
}) {
    const [suggestions, setSuggestions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef(null);
    const debounceTimeout = useRef(null);

    useEffect(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchSuggestions = async (searchTerm) => {
        if (!searchTerm) {
            setSuggestions([]);
            return;
        }
        setLoading(true);
        try {
            const res = await api.get(endpoint, { params: { [searchKey]: searchTerm } });
            // API returns paginated data (res.data.data.customers or res.data.data.products) or array
            // check if res.data.data is array or object payload.
            // productController: return paginated(res, products, pagination) -> { data: products, pagination }
            // So the array is likely at res.data.data
            let data = res.data.data;
            if (!Array.isArray(data)) {
                // If the controller returns a differently nested object (e.g. res.data.data.products)
                // Let's check common keys
                if (data && Array.isArray(data.products)) data = data.products;
                else if (data && Array.isArray(data.customers)) data = data.customers;
                else if (data && Array.isArray(data.suppliers)) data = data.suppliers;
            }
            setSuggestions(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Error fetching suggestions:', err);
            setSuggestions([]);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const val = e.target.value;
        onChange(val);
        setIsOpen(true);

        if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
        
        debounceTimeout.current = setTimeout(() => {
            fetchSuggestions(val);
        }, 300);
    };

    return (
        <div ref={wrapperRef} className="relative w-full">
            <input
                type="text"
                value={value}
                onChange={handleInputChange}
                onFocus={() => {
                    setIsOpen(true);
                    if (value && suggestions.length === 0) fetchSuggestions(value);
                }}
                className={className}
                placeholder={placeholder}
            />
            {isOpen && value.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-surface-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                    {loading ? (
                        <div className="p-3 text-sm text-surface-500 text-center">Loading...</div>
                    ) : suggestions.length > 0 ? (
                        suggestions.map((item, idx) => (
                            <div
                                key={item.id || idx}
                                className="p-3 hover:bg-surface-50 cursor-pointer border-b text-sm last:border-b-0 border-surface-100"
                                onClick={() => {
                                    onSelect(item);
                                    setIsOpen(false);
                                }}
                            >
                                {renderOption ? renderOption(item) : item.name}
                            </div>
                        ))
                    ) : (
                        <div 
                            className="p-3 bg-primary-50 hover:bg-primary-100 cursor-pointer text-sm text-primary-600 font-bold text-center border-t border-primary-100"
                            onClick={() => {
                                onSelect({ id: 'NEW', name: value });
                                setIsOpen(false);
                            }}
                        >
                            + Add "<span className="italic">{value}</span>" as New
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
