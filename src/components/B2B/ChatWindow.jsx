import { useState, useEffect, useRef } from 'react';
import { b2bAPI } from '../../services/api';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import { X, Send } from 'lucide-react';

export default function ChatWindow({ invoice, onClose }) {
    const { user } = useAuth();
    const { socket } = useSocket();
    
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const messagesEndRef = useRef(null);

    const storeId = user?.storeId;
    const isSeller = invoice.sellerStoreId === storeId;
    const partnerName = isSeller ? invoice.buyerStore.name : invoice.sellerStore.name;

    useEffect(() => {
        loadMessages();
        
        if (socket) {
            socket.emit('join_invoice', invoice.id);
            socket.on('new_message', (message) => {
                setMessages(prev => [...prev, message]);
            });
        }

        return () => {
            if (socket) socket.off('new_message');
        };
    }, [invoice.id, socket]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const loadMessages = async () => {
        try {
            const { data } = await b2bAPI.getMessages(invoice.id);
            if (data.success) {
                setMessages(data.data);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleSend = async (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        try {
            // Optimistic update 
            const tempMessage = {
                id: Date.now(),
                messageText: newMessage,
                senderStoreId: storeId,
                createdAt: new Date().toISOString()
            };
            setMessages(prev => [...prev, tempMessage]);
            setNewMessage('');

            await b2bAPI.sendMessage(invoice.id, tempMessage.messageText);
            // new_message event via socket handles actual update
        } catch (err) {
            console.error('Failed to send message', err);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-xl flex flex-col h-[600px] max-h-[90vh] overflow-hidden">
                
                <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800 flex items-center justify-between shadow-sm">
                    <div>
                        <h2 className="text-sm font-bold text-gray-900 dark:text-white">Negotiation: {partnerName}</h2>
                        <p className="text-xs text-gray-500">Invoice Amount: ₹{Number(invoice.totalAmount).toLocaleString()}</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900">
                    {loading ? (
                        <p className="text-center text-gray-500 text-sm">Loading chat history...</p>
                    ) : messages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center opacity-50">
                            <p className="text-sm text-gray-500">No messages yet.</p>
                            <p className="text-xs text-gray-400 mt-1">Start the negotiation or ask for a correction.</p>
                        </div>
                    ) : (
                        messages.map((msg, idx) => {
                            const isMine = msg.senderStoreId === storeId;
                            return (
                                <div key={msg.id || idx} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[80%] rounded-2xl px-4 py-2 shadow-sm ${
                                        isMine 
                                            ? 'bg-indigo-600 text-white rounded-br-sm' 
                                            : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-100 dark:border-gray-700 rounded-bl-sm'
                                    }`}>
                                        <p className="text-[13px] whitespace-pre-wrap">{msg.messageText}</p>
                                        <p className={`text-[10px] mt-1 text-right ${isMine ? 'text-indigo-200' : 'text-gray-400'}`}>
                                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                </div>
                            );
                        })
                    )}
                    <div ref={messagesEndRef} />
                </div>

                <form onSubmit={handleSend} className="p-3 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            value={newMessage}
                            onChange={e => setNewMessage(e.target.value)}
                            placeholder="Type an internal message..."
                            className="flex-1 bg-gray-100 dark:bg-gray-900 border-0 rounded-xl px-4 py-2.5 text-sm focus:ring-0 text-gray-900 dark:text-white"
                        />
                        <button 
                            type="submit" 
                            disabled={!newMessage.trim()}
                            className="p-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:bg-indigo-400 transition"
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </div>
                </form>

            </div>
        </div>
    );
}
