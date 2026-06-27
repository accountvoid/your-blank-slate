import { useState, useEffect, useLayoutEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameState } from '@/hooks/useGameState';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { useAuth } from '@/hooks/useAuth';
import { AlphaNoticeModal } from '@/components/AlphaNoticeModal';
import { toast } from '@/hooks/use-toast';
import { Mail, Loader2, CheckCircle, KeyRound, Lock, LogIn } from 'lucide-react';

type OnboardingStep = 'welcome' | 'login_choice' | 'login' | 'name' | 'email' | 'verify_otp' | 'password' | 'loading' | 'alpha';

const Onboarding = () => {
  const navigate = useNavigate();
  const { completeOnboarding } = useGameState();
  const { playClick, playLevelUp } = useSoundEffects();
  const { user, loading: authLoading, signInWithOtp, verifyOtp, signIn, updatePassword } = useAuth(); 
  const [step, setStep] = useState<OnboardingStep>('welcome');
  const [playerName, setPlayerName] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitialLoading(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  useLayoutEffect(() => {
    if (isInitialLoading) return;

    const systemSound = new Audio('/SystemNotificationSound.wav');
    systemSound.preload = 'auto';
    const playPromise = systemSound.play();
    
    if (playPromise !== undefined) {
      playPromise.catch(() => {});
    }

    return () => {
      systemSound.pause();
      systemSound.currentTime = 0;
    };
  }, [step, isInitialLoading]);

  useEffect(() => {
    if (authLoading) return;
    
    if (user) {
      const needsPassword = localStorage.getItem('needsPassword');
      const savedName = localStorage.getItem('pendingPlayerName');
      
      // الأولوية القصوى: إذا كان المستخدم يحتاج كلمة مرور
      if (needsPassword === 'true') {
        if (step !== 'password') {
          setStep('password');
        }
        return; // لا تفعل أي شيء آخر - يجب أن يضع كلمة المرور أولاً
      }
      
      // إذا كان في عملية تسجيل جديدة ولم يصل لشاشة alpha
      if (savedName && step !== 'alpha' && step !== 'password') {
        setStep('alpha');
        return;
      }
      
      // المستخدم مسجل دخول بشكل طبيعي - ننقله للصفحة الرئيسية
      if (!savedName && !needsPassword) {
        navigate('/');
      }
    }
  }, [user, authLoading, navigate, step]);

  const handleAccept = () => {
    playClick();
    setStep('login_choice');
  };

  const handleDecline = () => {
    window.close();
  };

  const handleNewAccount = () => {
    playClick();
    setStep('name');
  };

  const handleExistingAccount = () => {
    playClick();
    setStep('login');
  };

  const handleLogin = async () => {
    if (!email.trim() || !loginPassword.trim()) return;
    setIsSubmitting(true);
    
    const { data, error } = await signIn(email.trim(), loginPassword);
    
    if (error) {
      toast({
        title: 'فشل تسجيل الدخول',
        description: 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
        variant: 'destructive',
      });
      setIsSubmitting(false);
      return;
    }
    
    if (data?.user) {
      playLevelUp();
      const playerNameFromMeta = data.user.user_metadata?.player_name;
      if (playerNameFromMeta) {
        completeOnboarding(playerNameFromMeta);
      }
      navigate('/');
    }
    setIsSubmitting(false);
  };

  const handleNameNext = () => {
    if (playerName.trim()) {
      playClick();
      setStep('email');
    }
  };

  const handleSendOtp = async () => {
    if (!email.trim() || !playerName.trim()) return;
    setIsSubmitting(true);
    const { error } = await signInWithOtp(email.trim(), playerName.trim());
    if (error) {
      toast({
        title: 'خطأ',
        description: error.message || 'حدث خطأ أثناء إرسال الكود',
        variant: 'destructive',
      });
      setIsSubmitting(false);
      return;
    }
    localStorage.setItem('pendingPlayerName', playerName.trim());
    playLevelUp();
    setStep('verify_otp');
    setIsSubmitting(false);
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) return;
    setIsSubmitting(true);
    const { data, error } = await verifyOtp(email.trim(), otp);
    if (error) {
      toast({
        title: 'فشل التحقق',
        description: 'الكود غير صحيح أو انتهت صلاحيته',
        variant: 'destructive',
      });
      setIsSubmitting(false);
      return;
    }
    
    if (data?.user) {
      // التحقق إذا كان المستخدم جديد (لا يملك كلمة مرور)
      localStorage.setItem('needsPassword', 'true');
      playLevelUp();
      setStep('password');
    }
    setIsSubmitting(false);
  };

  const handleSetPassword = async () => {
    if (password.length < 6) {
      toast({
        title: 'كلمة المرور قصيرة',
        description: 'يجب أن تكون كلمة المرور 6 أحرف على الأقل',
        variant: 'destructive',
      });
      return;
    }
    
    if (password !== confirmPassword) {
      toast({
        title: 'كلمات المرور غير متطابقة',
        description: 'تأكد من تطابق كلمة المرور',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    const { error } = await updatePassword(password);
    
    if (error) {
      toast({
        title: 'خطأ',
        description: error.message || 'فشل في تعيين كلمة المرور',
        variant: 'destructive',
      });
      setIsSubmitting(false);
      return;
    }
    
    localStorage.removeItem('needsPassword');
    playLevelUp();
    setStep('alpha');
    setIsSubmitting(false);
  };

  const handleAlphaDismiss = () => {
    const savedName = localStorage.getItem('pendingPlayerName');
    if (savedName) {
      completeOnboarding(savedName);
      localStorage.removeItem('pendingPlayerName');
    }
    navigate('/');
  };

  if (isInitialLoading || authLoading) {
    return (
      <div className="min-h-screen bg-[#010205] flex items-center justify-center transition-opacity duration-1000">
        {authLoading && <Loader2 className="w-8 h-8 animate-spin text-blue-500" />}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#010205] flex items-center justify-center p-2 overflow-hidden select-none font-mono tracking-normal">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-blue-900/10 blur-[120px] rounded-full" />
      </div>

      <div key={step} className="relative w-full max-w-[550px] animate-super-smooth-entry px-2">
        <div className="absolute -top-6 left-0 right-0 h-[2px] bg-[#42a5f5] shadow-[0_0_20px_#1e88e5,0_0_8px_#fff] z-20 animate-line-expand" />
        <div className="absolute -bottom-6 left-0 right-0 h-[2px] bg-[#42a5f5] shadow-[0_0_20px_#1e88e5,0_0_8px_#fff] z-20 animate-line-expand" />

        <div className="relative border-x border-blue-500/20 bg-transparent backdrop-blur-2xl">
          <div className="bg-black/75 border border-blue-500/30 overflow-hidden" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)' }}>
            <div className="bg-black/90 border-b border-blue-500/30 py-4 flex items-center justify-center gap-3">
              <div className="w-6 h-6 border border-[#a2d2ff] rounded-full flex items-center justify-center shadow-[0_0_10px_rgba(162,210,255,0.6)]">
                <span className="text-[#a2d2ff] font-bold text-sm">!</span>
              </div>
              <h2 className="text-[#e3f2fd] font-medium tracking-[0.25em] text-base drop-shadow-[0_0_8px_rgba(227,242,253,0.7)]">NOTIFICATION</h2>
            </div>

            <div className="p-8 sm:p-12 flex flex-col items-center animate-content-fade">
              {step === 'welcome' && (
                <div className="w-full text-center space-y-8">
                  <div className="space-y-6 text-[#e3f2fd] text-sm sm:text-base font-normal tracking-wide drop-shadow-[0_0_5px_rgba(227,242,253,0.5)]">
                    <p className="flex items-center justify-center gap-2">
                      <span className="inline-block w-1.5 h-1.5 bg-[#42a5f5] rounded-full shadow-[0_0_6px_#42a5f5]" />
                      [You have acquired the qualifications]
                    </p>
                    <p className="flex items-center justify-center gap-2">
                      <span className="inline-block w-1.5 h-1.5 bg-[#42a5f5] rounded-full shadow-[0_0_6px_#42a5f5]" />
                      [to be a <span className="text-[#42a5f5] font-semibold drop-shadow-[0_0_10px_rgba(66,165,245,0.8)]">Player</span>.]
                    </p>
                  </div>
                  <div className="flex flex-row gap-4 w-full max-w-sm mx-auto pt-4">
                    <button onClick={handleAccept} className="flex-1 py-2 bg-transparent border border-blue-400/60 text-[#e3f2fd] font-medium text-sm sm:text-base tracking-wider hover:bg-blue-500/20 hover:border-blue-400 transition-all shadow-[inset_0_0_8px_rgba(66,165,245,0.1)]">ACCEPT</button>
                    <button onClick={handleDecline} className="flex-1 py-2 bg-transparent border border-white/10 text-white/30 font-medium text-xs sm:text-sm tracking-wider hover:border-white/20 hover:text-white/50 transition-all">NOT ACCEPT</button>
                  </div>
                </div>
              )}

              {step === 'login_choice' && (
                <div className="w-full text-center flex flex-col items-center">
                  <LogIn className="w-10 h-10 text-[#42a5f5] mb-5 drop-shadow-[0_0_15px_rgba(66,165,245,0.6)]" />
                  <h2 className="text-[#e3f2fd] font-medium tracking-[0.2em] text-xs sm:text-sm mb-3 drop-shadow-[0_0_6px_rgba(227,242,253,0.5)]">ACCOUNT ACCESS</h2>
                  <p className="text-[#e3f2fd]/70 text-xs sm:text-sm mb-8 font-sans">[هل لديك حساب مسبق؟]</p>
                  <div className="flex flex-col gap-3.5 w-full max-w-[280px]">
                    <button onClick={handleNewAccount} className="py-2.5 bg-transparent border border-blue-400/60 text-[#e3f2fd] font-medium text-sm sm:text-base tracking-wider hover:bg-blue-500/20 transition-all font-sans">حساب جديد</button>
                    <button onClick={handleExistingAccount} className="py-2.5 bg-transparent border border-white/10 text-white/40 font-medium text-xs sm:text-sm hover:border-white/30 hover:text-white/70 transition-all font-sans">لدي حساب</button>
                  </div>
                </div>
              )}

              {step === 'login' && (
                <div className="w-full text-center flex flex-col items-center">
                  <LogIn className="w-10 h-10 text-[#42a5f5] mb-5 drop-shadow-[0_0_15px_rgba(66,165,245,0.6)]" />
                  <h2 className="text-[#e3f2fd] font-medium tracking-[0.2em] text-xs sm:text-sm mb-3 drop-shadow-[0_0_6px_rgba(227,242,253,0.5)]">LOGIN</h2>
                  <p className="text-[#e3f2fd]/70 text-xs sm:text-sm mb-6 font-sans">[أدخل بيانات حسابك]</p>
                  <input 
                    type="email" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    placeholder="البريد الإلكتروني" 
                    className="w-full max-w-[300px] bg-transparent border-b border-blue-500/30 py-2 text-center text-sm font-medium text-white focus:outline-none focus:border-blue-400 transition-all mb-4 font-sans" 
                    dir="ltr" 
                  />
                  <input 
                    type="password" 
                    value={loginPassword} 
                    onChange={(e) => setLoginPassword(e.target.value)} 
                    placeholder="كلمة المرور" 
                    className="w-full max-w-[300px] bg-transparent border-b border-blue-500/30 py-2 text-center text-sm font-medium text-white focus:outline-none focus:border-blue-400 transition-all font-sans" 
                    dir="ltr" 
                  />
                  <button 
                    onClick={handleLogin} 
                    disabled={!email.trim() || !loginPassword.trim() || isSubmitting} 
                    className="mt-8 px-8 py-2 bg-transparent border border-blue-400/60 text-[#e3f2fd] font-medium text-sm sm:text-base tracking-wider hover:bg-blue-500/20 transition-all flex items-center gap-2 disabled:opacity-40 font-sans"
                  >
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'دخول'}
                  </button>
                  <button onClick={() => setStep('login_choice')} className="mt-4 text-white/30 text-xs hover:text-white/60 transition-all font-sans">رجوع</button>
                </div>
              )}

              {step === 'name' && (
                <div className="w-full text-center flex flex-col items-center">
                  <h2 className="text-[#e3f2fd] font-medium tracking-[0.2em] text-xs sm:text-sm mb-6 drop-shadow-[0_0_6px_rgba(227,242,253,0.5)]">CHARACTER REGISTRATION</h2>
                  <input type="text" value={playerName} onChange={(e) => setPlayerName(e.target.value)} placeholder="ENTER NAME..." className="w-full max-w-[250px] bg-transparent border-b border-blue-500/30 py-2 text-center text-lg font-medium text-white focus:outline-none focus:border-blue-400 transition-all placeholder:text-white/10" />
                  <button onClick={handleNameNext} disabled={!playerName.trim()} className="mt-8 px-8 py-2 bg-transparent border border-blue-400/60 text-[#e3f2fd] font-medium text-sm sm:text-base tracking-wider hover:bg-blue-500/20 transition-all">NEXT</button>
                </div>
              )}

              {step === 'email' && (
                <div className="w-full text-center flex flex-col items-center">
                  <Mail className="w-10 h-10 text-[#42a5f5] mb-5 drop-shadow-[0_0_15px_rgba(66,165,245,0.6)]" />
                  <h2 className="text-[#e3f2fd] font-medium tracking-[0.2em] text-xs sm:text-sm mb-3 drop-shadow-[0_0_6px_rgba(227,242,253,0.5)]">SYSTEM VERIFICATION</h2>
                  <p className="text-[#e3f2fd]/70 text-xs sm:text-sm mb-6 font-sans">[أدخل بريدك الإلكتروني لتلقي رمز التحقق]</p>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com" className="w-full max-w-[300px] bg-transparent border-b border-blue-500/30 py-2 text-center text-base font-medium text-white focus:outline-none focus:border-blue-400 transition-all" dir="ltr" />
                  <button onClick={handleSendOtp} disabled={!email.trim() || isSubmitting} className="mt-8 px-8 py-2 bg-transparent border border-blue-400/60 text-[#e3f2fd] font-medium text-sm sm:text-base tracking-wider hover:bg-blue-500/20 transition-all flex items-center gap-2">
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'SEND CODE'}
                  </button>
                </div>
              )}

              {step === 'verify_otp' && (
                <div className="w-full text-center flex flex-col items-center">
                  <KeyRound className="w-10 h-10 text-[#42a5f5] mb-5 drop-shadow-[0_0_15px_rgba(66,165,245,0.6)]" />
                  <h2 className="text-[#e3f2fd] font-medium tracking-[0.2em] text-xs sm:text-sm mb-3 drop-shadow-[0_0_6px_rgba(227,242,253,0.5)]">ENTER AUTHENTICATION CODE</h2>
                  <p className="text-[#e3f2fd]/70 text-xs sm:text-sm mb-6 font-sans">[تم إرسال الكود إلى {email}]</p>
                  <input type="text" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} maxLength={6} placeholder="000000" className="w-full max-w-[200px] bg-transparent border-b border-blue-500/30 py-2 text-center text-2xl tracking-[0.25em] font-medium text-[#42a5f5] focus:outline-none focus:border-blue-400 transition-all" dir="ltr" />
                  <button onClick={handleVerifyOtp} disabled={otp.length !== 6 || isSubmitting} className="mt-8 px-8 py-2 bg-transparent border border-blue-400/60 text-[#e3f2fd] font-medium text-sm sm:text-base tracking-wider hover:bg-blue-500/20 transition-all flex items-center gap-2">
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'VERIFY'}
                  </button>
                  <button onClick={() => setStep('email')} className="mt-4 text-white/30 text-xs hover:text-white/60 transition-all font-sans">CHANGE EMAIL</button>
                </div>
              )}

              {step === 'password' && (
                <div className="w-full text-center flex flex-col items-center">
                  <Lock className="w-10 h-10 text-[#42a5f5] mb-5 drop-shadow-[0_0_15px_rgba(66,165,245,0.6)]" />
                  <h2 className="text-[#e3f2fd] font-medium tracking-[0.2em] text-xs sm:text-sm mb-3 drop-shadow-[0_0_6px_rgba(227,242,253,0.5)]">SET PASSWORD</h2>
                  <p className="text-[#e3f2fd]/70 text-xs sm:text-sm mb-6 font-sans">[اختر كلمة مرور قوية لحسابك]</p>
                  <input 
                    type="password" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    placeholder="كلمة المرور" 
                    className="w-full max-w-[280px] bg-transparent border-b border-blue-500/30 py-2 text-center text-sm font-medium text-white focus:outline-none focus:border-blue-400 transition-all mb-4 font-sans" 
                    dir="ltr" 
                  />
                  <input 
                    type="password" 
                    value={confirmPassword} 
                    onChange={(e) => setConfirmPassword(e.target.value)} 
                    placeholder="تأكيد كلمة المرور" 
                    className="w-full max-w-[280px] bg-transparent border-b border-blue-500/30 py-2 text-center text-sm font-medium text-white focus:outline-none focus:border-blue-400 transition-all font-sans" 
                    dir="ltr" 
                  />
                  <p className="text-white/30 text-[10px] mt-2 font-sans">6 أحرف على الأقل</p>
                  <button 
                    onClick={handleSetPassword} 
                    disabled={password.length < 6 || password !== confirmPassword || isSubmitting} 
                    className="mt-6 px-8 py-2 bg-transparent border border-blue-400/60 text-[#e3f2fd] font-medium text-sm sm:text-base tracking-wider hover:bg-blue-500/20 transition-all flex items-center gap-2 disabled:opacity-40 font-sans"
                  >
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'تأكيد'}
                  </button>
                </div>
              )}

              {step === 'alpha' && (
                <div className="w-full text-center flex flex-col items-center">
                  <CheckCircle className="w-12 h-12 text-[#42a5f5] mb-5 drop-shadow-[0_0_15px_rgba(66,165,245,0.6)]" />
                  <h2 className="text-[#e3f2fd] font-medium tracking-[0.2em] text-xs sm:text-sm mb-3 drop-shadow-[0_0_6px_rgba(227,242,253,0.5)]">SYSTEM ACCESS GRANTED</h2>
                  <p className="text-[#e3f2fd]/60 text-xs mb-6 italic">[Initial synchronization complete]</p>
                  <button onClick={handleAlphaDismiss} className="mt-8 px-8 py-2 bg-transparent border border-blue-400/60 text-[#e3f2fd] font-medium text-sm sm:text-base tracking-wider hover:bg-blue-500/20 transition-all shadow-[0_0_15px_rgba(66,165,245,0.2)]">START SYSTEM</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes super-smooth-entry {
          0% { transform: scaleY(0.005) scaleX(0.1); opacity: 0; filter: brightness(3); }
          40% { transform: scaleY(0.005) scaleX(1); opacity: 1; filter: brightness(1.8); }
          100% { transform: scaleY(1) scaleX(1); opacity: 1; filter: brightness(1); }
        }

        @keyframes line-expand {
          0% { width: 0%; left: 50%; opacity: 0; }
          40% { width: 0%; left: 50%; opacity: 1; }
          100% { width: 100%; left: 0%; opacity: 1; }
        }

        @keyframes content-fade-in { 
          0% { opacity: 0; transform: translateY(5px); filter: blur(3px); }
          100% { opacity: 1; transform: translateY(0); filter: blur(0); }
        }

        .animate-super-smooth-entry { 
          animation: super-smooth-entry 1.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; 
        }

        .animate-line-expand {
          animation: line-expand 1.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .animate-content-fade { 
          animation: content-fade-in 0.8s ease-out 1.1s both; 
        }
      `}</style>
      
      <AlphaNoticeModal show={step === 'alpha'} onDismiss={handleAlphaDismiss} />
    </div>
  );
};

export default Onboarding;
