import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { planAPI } from '../services/api';
import { HiOutlineEnvelope, HiOutlineLockClosed, HiOutlineUser, HiOutlinePhone, HiOutlineEye, HiOutlineEyeSlash, HiOutlineBuildingStorefront, HiOutlineArrowRight, HiOutlineCheckCircle } from 'react-icons/hi2';
import Logo from '../components/common/Logo';

export default function RegisterPage() {
    const { t, i18n } = useTranslation();
    const { register, loading, error, setError } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const prePlan = searchParams.get('plan');

    const [plans, setPlans] = useState([]);
    const [step, setStep] = useState(1);
    const [form, setForm] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',
        storeName: '',
        planId: prePlan || '',
        employeeCode: ''
    });
    const [showPassword, setShowPassword] = useState(false);

    useEffect(() => {
        fetchPlans();
    }, []);

    const fetchPlans = async () => {
        try {
            const { data } = await planAPI.getAll();
            if (data.success) {
                setPlans(data.data);
                if (prePlan) {
                    setForm(prev => ({ ...prev, planId: prePlan }));
                }
            }
        } catch (err) {
            console.error("Failed to fetch plans");
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (form.password !== form.confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (!form.phone || form.phone.length < 10) {
            setError('Please enter a valid 10-digit mobile number');
            return;
        }

        if (!form.storeName && !form.employeeCode) {
            setError('Store Name is required for business registration');
            return;
        }

        try {
            const { confirmPassword, ...registerData } = form;
            const res = await register(registerData);
            
            if (form.planId) {
                navigate(`/checkout?plan=${form.planId}`);
            } else {
                navigate('/dashboard');
            }
        } catch (_) {
            // Error handled by context
        }
    };

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
        if (error) setError(null);
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0 bg-background-cream">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent-500/10 rounded-full blur-3xl" />
            </div>

            <div className="w-full max-w-xl relative z-10 animate-fade-in">
                {/* Logo */}
                <div className="flex flex-col items-center mb-8">
                    <Logo variant="login" />
                </div>

                {/* Card */}
                <div className="glass-card p-5 sm:p-10">
                    <div className="flex items-center justify-between mb-6 sm:mb-8">
                        <div>
                            <h2 className="text-xl sm:text-2xl font-black text-surface-900 tracking-tight">Create Business Account</h2>
                            <p className="text-xs sm:text-sm text-surface-500 mt-1">Get started with VyapariSetu in minutes</p>
                        </div>
                        <div className="flex gap-1.5">
                            <div className={`w-2.5 h-2.5 rounded-full transition-all ${step === 1 ? 'bg-primary-600 w-8' : 'bg-gray-200'}`} />
                            <div className={`w-2.5 h-2.5 rounded-full transition-all ${step === 2 ? 'bg-primary-600 w-8' : 'bg-gray-200'}`} />
                        </div>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-sm font-semibold animate-shake">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {step === 1 ? (
                            <>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                    <div>
                                        <label className="input-label">First Name</label>
                                        <div className="relative">
                                            <HiOutlineUser className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400" />
                                            <input
                                                type="text"
                                                name="firstName"
                                                className="input-field pl-11"
                                                placeholder="John"
                                                value={form.firstName}
                                                onChange={handleChange}
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="input-label">Last Name</label>
                                        <div className="relative">
                                            <HiOutlineUser className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400" />
                                            <input
                                                type="text"
                                                name="lastName"
                                                className="input-field pl-11"
                                                placeholder="Doe"
                                                value={form.lastName}
                                                onChange={handleChange}
                                                required
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="input-label">Email Address</label>
                                    <div className="relative">
                                        <HiOutlineEnvelope className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400" />
                                        <input
                                            type="email"
                                            name="email"
                                            className="input-field pl-11"
                                            placeholder="john@example.com"
                                            value={form.email}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="input-label">Mobile Number</label>
                                    <div className="relative">
                                        <HiOutlinePhone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400" />
                                        <input
                                            type="tel"
                                            name="phone"
                                            className="input-field pl-11"
                                            placeholder="9876543210"
                                            value={form.phone}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setStep(2)}
                                        className="btn-primary w-full py-3.5 sm:py-4 text-sm sm:text-base flex items-center justify-center gap-2"
                                    >
                                        Next: Store Details <HiOutlineArrowRight />
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                <div>
                                    <label className="input-label">Store / Business Name</label>
                                    <div className="relative">
                                        <HiOutlineBuildingStorefront className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400" />
                                        <input
                                            type="text"
                                            name="storeName"
                                            className="input-field pl-11"
                                            placeholder="Example Retail Store"
                                            value={form.storeName}
                                            onChange={handleChange}
                                            required={!form.employeeCode}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="input-label">Selected Plan</label>
                                    <select 
                                        name="planId" 
                                        value={form.planId} 
                                        onChange={handleChange}
                                        className="input-field appearance-none"
                                        style={{ background: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236B7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E") no-repeat right 0.75rem center/1rem` }}
                                    >
                                        <option value="">Choose a subscription plan</option>
                                        {plans.map(p => (
                                            <option key={p._id} value={p._id}>
                                                {p.name} - ₹{p.price} / {p.durationDays} days
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                    <div>
                                        <label className="input-label">Password</label>
                                        <div className="relative">
                                            <HiOutlineLockClosed className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400" />
                                            <input
                                                type={showPassword ? 'text' : 'password'}
                                                name="password"
                                                className="input-field pl-11"
                                                value={form.password}
                                                onChange={handleChange}
                                                required
                                                minLength={6}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="input-label">Confirm</label>
                                        <div className="relative">
                                            <HiOutlineLockClosed className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400" />
                                            <input
                                                type={showPassword ? 'text' : 'password'}
                                                name="confirmPassword"
                                                className="input-field pl-11"
                                                value={form.confirmPassword}
                                                onChange={handleChange}
                                                required
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 sm:gap-4 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setStep(1)}
                                        className="w-1/3 py-3.5 sm:py-4 text-surface-500 font-bold hover:text-surface-900 transition-colors text-sm sm:text-base"
                                    >
                                        Back
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="flex-1 btn-primary py-3.5 sm:py-4 text-sm sm:text-base"
                                    >
                                        {loading ? 'Setting up...' : 'Complete Sign Up'}
                                    </button>
                                </div>
                            </>
                        )}
                    </form>

                    <div className="mt-10 pt-10 border-t border-gray-100 text-center">
                        <p className="text-sm text-surface-500">
                            {t('auth.alreadyHaveAccount')}{' '}
                            <Link to="/login" className="text-primary-600 hover:text-primary-500 font-bold">
                                {t('auth.signIn')}
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
