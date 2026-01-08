import React, { useState } from 'react';
import { User, Lock, Mail, Phone, LogIn, UserPlus, Sparkles, AlertCircle, ArrowLeft, ShieldCheck } from 'lucide-react';
import { login, signup, verifyOTP, AuthUser } from './authService';

interface AuthOverlayProps {
    onLoginSuccess: (user: AuthUser, token: string) => void;
}

const AuthOverlay: React.FC<AuthOverlayProps> = ({ onLoginSuccess }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [step, setStep] = useState(1); // 1: Credentials, 2: OTP
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [signupSuccess, setSignupSuccess] = useState(false);

    // Form states
    const [emailOrUsername, setEmailOrUsername] = useState('');
    const [password, setPassword] = useState('');

    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // OTP state
    const [otp, setOtp] = useState('');
    const [targetEmail, setTargetEmail] = useState('');

    const handleInitialSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            if (isLogin) {
                const res = await login({ emailOrUsername, password });
                if (res.success && res.otpRequired) {
                    setTargetEmail(res.email || '');
                    setStep(2);
                } else {
                    setError(res.error || 'Login failed');
                }
            } else {
                if (password !== confirmPassword) {
                    setError('Passwords do not match');
                    setLoading(false);
                    return;
                }
                const res = await signup({ username, email, phone, password });
                if (res.success && res.otpRequired) {
                    setTargetEmail(res.email || '');
                    setStep(2);
                } else {
                    setError(res.error || 'Signup failed');
                }
            }
        } catch (err) {
            setError('An error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleOtpSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (otp.length !== 6) {
            setError('Please enter a valid 6-digit OTP');
            return;
        }
        setError(null);
        setLoading(true);

        try {
            const signupData = !isLogin ? { username, email, phone, password } : undefined;
            const res = await verifyOTP({
                email: targetEmail,
                otp,
                isSignup: !isLogin,
                signupData
            });

            if (res.success && res.user && res.token) {
                if (!isLogin) setSignupSuccess(true);
                setTimeout(() => {
                    onLoginSuccess(res.user!, res.token!);
                }, isLogin ? 0 : 2000);
            } else {
                setError(res.error || 'Invalid OTP');
            }
        } catch (err) {
            setError('Verification failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] bg-[#0A0D14] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            <div className="w-full max-w-[440px] bg-[#1C222E] rounded-[40px] shadow-2xl border border-white/5 overflow-hidden animate-in fade-in zoom-in-95 duration-300">

                {/* Header Decor */}
                <div className="h-2 bg-gradient-to-r from-cyan-400 via-indigo-500 to-purple-600"></div>

                <div className="p-8 sm:p-10 space-y-8">
                    {/* Logo/Title Area */}
                    <div className="text-center space-y-2">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-500 to-cyan-400 rounded-2xl shadow-lg shadow-cyan-500/20 mb-4 transform -rotate-3 hover:rotate-0 transition-transform duration-300">
                            <Sparkles className="text-white w-8 h-8" />
                        </div>
                        <h1 className="text-3xl font-black text-white tracking-tight">FinFlex</h1>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.2em]">Level Up Your Money</p>
                    </div>

                    {step === 1 && (
                        <div className="bg-[#111723] p-1.5 rounded-2xl flex border border-white/5">
                            <button
                                onClick={() => { setIsLogin(true); setError(null); }}
                                className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${isLogin ? 'bg-white text-black shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                Login
                            </button>
                            <button
                                onClick={() => { setIsLogin(false); setError(null); }}
                                className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${!isLogin ? 'bg-white text-black shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                Sign Up
                            </button>
                        </div>
                    )}

                    {/* Error Message */}
                    {error && (
                        <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-2xl flex items-center gap-3 animate-shake">
                            <AlertCircle className="text-rose-500 shrink-0" size={18} />
                            <p className="text-xs font-bold text-rose-200">{error}</p>
                        </div>
                    )}

                    {signupSuccess && (
                        <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
                            <Sparkles className="text-emerald-400 shrink-0" size={18} />
                            <p className="text-xs font-bold text-emerald-200">Account created! Redirecting to dashboard...</p>
                        </div>
                    )}

                    {step === 1 ? (
                        <form onSubmit={handleInitialSubmit} className="space-y-5">
                            {isLogin ? (
                                <>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Email or Username</label>
                                        <div className="relative group">
                                            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-cyan-400 transition-colors" size={18} />
                                            <input
                                                type="text"
                                                required
                                                value={emailOrUsername}
                                                onChange={(e) => setEmailOrUsername(e.target.value)}
                                                placeholder="alex@example.com"
                                                className="w-full bg-[#111723] border border-white/5 rounded-2xl pl-12 pr-4 py-4 text-sm font-bold text-white placeholder:text-slate-700 focus:outline-none focus:border-cyan-500/50 transition-all"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Password</label>
                                        <div className="relative group">
                                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-cyan-400 transition-colors" size={18} />
                                            <input
                                                type="password"
                                                required
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                placeholder="••••••••"
                                                className="w-full bg-[#111723] border border-white/5 rounded-2xl pl-12 pr-4 py-4 text-sm font-bold text-white placeholder:text-slate-700 focus:outline-none focus:border-cyan-500/50 transition-all"
                                            />
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Username</label>
                                            <div className="relative group">
                                                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-cyan-400 transition-colors" size={18} />
                                                <input
                                                    type="text"
                                                    required
                                                    value={username}
                                                    onChange={(e) => setUsername(e.target.value)}
                                                    placeholder="alex_fin"
                                                    className="w-full bg-[#111723] border border-white/5 rounded-2xl pl-12 pr-4 py-4 text-sm font-bold text-white placeholder:text-slate-700 focus:outline-none focus:border-cyan-500/50 transition-all"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Email</label>
                                            <div className="relative group">
                                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-cyan-400 transition-colors" size={18} />
                                                <input
                                                    type="email"
                                                    required
                                                    value={email}
                                                    onChange={(e) => setEmail(e.target.value)}
                                                    placeholder="alex@example.com"
                                                    className="w-full bg-[#111723] border border-white/5 rounded-2xl pl-12 pr-4 py-4 text-sm font-bold text-white placeholder:text-slate-700 focus:outline-none focus:border-cyan-500/50 transition-all"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Phone Number</label>
                                            <div className="relative group">
                                                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-cyan-400 transition-colors" size={18} />
                                                <input
                                                    type="tel"
                                                    required
                                                    value={phone}
                                                    onChange={(e) => setPhone(e.target.value)}
                                                    placeholder="9876543210"
                                                    className="w-full bg-[#111723] border border-white/5 rounded-2xl pl-12 pr-4 py-4 text-sm font-bold text-white placeholder:text-slate-700 focus:outline-none focus:border-cyan-500/50 transition-all"
                                                />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Password</label>
                                                <div className="relative group">
                                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-cyan-400 transition-colors" size={18} />
                                                    <input
                                                        type="password"
                                                        required
                                                        value={password}
                                                        onChange={(e) => setPassword(e.target.value)}
                                                        placeholder="••••••••"
                                                        className="w-full bg-[#111723] border border-white/5 rounded-2xl pl-12 pr-4 py-4 text-sm font-bold text-white placeholder:text-slate-700 focus:outline-none focus:border-cyan-500/50 transition-all"
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Confirm</label>
                                                <div className="relative group">
                                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-cyan-400 transition-colors" size={18} />
                                                    <input
                                                        type="password"
                                                        required
                                                        value={confirmPassword}
                                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                                        placeholder="••••••••"
                                                        className="w-full bg-[#111723] border border-white/5 rounded-2xl pl-12 pr-4 py-4 text-sm font-bold text-white placeholder:text-slate-700 focus:outline-none focus:border-cyan-500/50 transition-all"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-cyan-500 text-black py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-lg shadow-cyan-500/20 hover:bg-cyan-400 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:grayscale overflow-hidden group relative"
                            >
                                <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out"></div>
                                {loading ? (
                                    <div className="w-5 h-5 border-4 border-black/20 border-t-black rounded-full animate-spin"></div>
                                ) : (
                                    <>
                                        {isLogin ? <LogIn size={18} strokeWidth={3} /> : <UserPlus size={18} strokeWidth={3} />}
                                        <span>{isLogin ? 'Continue to OTP' : 'Create My Account'}</span>
                                    </>
                                )}
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleOtpSubmit} className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                            <button
                                type="button"
                                onClick={() => { setStep(1); setError(null); }}
                                className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors text-[10px] font-black uppercase tracking-widest"
                            >
                                <ArrowLeft size={14} /> Back
                            </button>

                            <div className="space-y-4">
                                <div className="text-center space-y-2">
                                    <div className="inline-flex p-3 bg-cyan-500/10 rounded-2xl text-cyan-400 mb-2">
                                        <ShieldCheck size={24} />
                                    </div>
                                    <h3 className="text-xl font-bold text-white">Verify Your Identity</h3>
                                    <p className="text-xs text-slate-400">
                                        We've sent a 6-digit code to <span className="text-cyan-400 font-bold">{targetEmail}</span>
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1 text-center block">Enter 6-Digit OTP</label>
                                    <input
                                        type="text"
                                        autoFocus
                                        required
                                        maxLength={6}
                                        value={otp}
                                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                                        placeholder="000000"
                                        className="w-full bg-[#111723] border border-white/5 rounded-3xl py-6 text-4xl font-black text-white text-center tracking-[0.5em] placeholder:text-slate-800 focus:outline-none focus:border-cyan-500/50 transition-all shadow-inner"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading || otp.length !== 6}
                                className="w-full bg-cyan-500 text-black py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-lg shadow-cyan-500/20 hover:bg-cyan-400 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:grayscale overflow-hidden group relative"
                            >
                                {loading ? (
                                    <div className="w-5 h-5 border-4 border-black/20 border-t-black rounded-full animate-spin"></div>
                                ) : (
                                    <>
                                        <Sparkles size={18} strokeWidth={3} />
                                        <span>Verify & Enter Dashboard</span>
                                    </>
                                )}
                            </button>
                        </form>
                    )}

                    {/* Footer */}
                    {step === 1 && (
                        <p className="text-center text-[10px] font-bold text-slate-600 uppercase tracking-widest">
                            {isLogin ? "Don't have an account?" : "Already have an account?"}{' '}
                            <button
                                onClick={() => { setIsLogin(!isLogin); setError(null); }}
                                className="text-cyan-400 hover:text-cyan-300 transition-colors"
                            >
                                {isLogin ? 'Sign Up' : 'Log In'}
                            </button>
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AuthOverlay;

