import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Shield, KeyRound, User, Users } from 'lucide-react';

interface AuthProps {
  onLogin: (user: any) => void;
}

export default function Auth({ onLogin }: AuthProps) {
  const [step, setStep] = useState<'loading' | 'manual_auth' | 'pin_entry' | 'set_pin' | 'forgot_pin'>('loading');
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [user, setUser] = useState<any>(null);
  const [otp, setOtp] = useState('');
  const [newPin, setNewPin] = useState('');
  const [otpSent, setOtpSent] = useState(false);

  useEffect(() => {
    const initAuth = async () => {
      try {
        // Check Telegram initData
        const tg = (window as any).Telegram?.WebApp;
        const initData = tg?.initData || '';
        
        // If no Telegram data, show manual auth
        if (!initData) {
          setStep('manual_auth');
          return;
        }

        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ initData })
        });
        
        const data = await res.json();

        if (data.requirePin) {
          setUser(data.user);
          setStep('pin_entry');
        } else if (data.success) {
          if (!data.user.hasPin) {
            setUser(data.user);
            setStep('set_pin');
          } else {
            onLogin(data.user);
          }
        } else {
          setStep('manual_auth');
        }
      } catch (e) {
        setStep('manual_auth');
      }
    };

    initAuth();
  }, [onLogin]);

  const handleManualAuth = async () => {
    setError('');
    if (!username || !pin) {
      setError('Заполните все поля');
      return;
    }
    if (pin.length !== 6) {
      setError('Пароль должен быть 6-значным');
      return;
    }

    try {
      const endpoint = mode === 'register' ? '/api/auth/register' : '/api/auth/login-manual';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, pin })
      });
      const data = await res.json();
      if (data.success) {
        onLogin(data.user);
      } else {
        setError(data.error || 'Ошибка авторизации');
      }
    } catch (e) {
      setError('Ошибка сети');
    }
  };

  const handlePinSubmit = async () => {
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          initData: (window as any).Telegram?.WebApp?.initData || '', 
          app_id: localStorage.getItem('mafia_app_id') || '',
          pin 
        })
      });
      const data = await res.json();
      if (data.success) {
        if (!localStorage.getItem('mafia_app_id') && data.user.app_id) {
           localStorage.setItem('mafia_app_id', data.user.app_id);
        }
        onLogin(data.user);
      } else {
        setError(data.error || 'Invalid PIN');
      }
    } catch (e) {
      setError('Network error');
    }
  };

  const handleSetPin = async () => {
    if (pin.length < 4) {
      setError('PIN must be at least 4 digits');
      return;
    }
    try {
      const res = await fetch('/api/auth/set-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, pin })
      });
      const data = await res.json();
      if (data.success) {
        if (!localStorage.getItem('mafia_app_id') && user.app_id) {
           localStorage.setItem('mafia_app_id', user.app_id);
        }
        onLogin(user);
      } else {
        setError(data.error || 'Failed to set PIN');
      }
    } catch (e) {
      setError('Network error');
    }
  };

  const handleForgotPin = async () => {
    setError('');
    try {
      const res = await fetch('/api/auth/forgot-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      });
      const data = await res.json();
      if (data.success) {
        setOtpSent(true);
      } else {
        setError(data.error || 'Failed to send OTP');
      }
    } catch (e) {
      setError('Network error');
    }
  };

  const handleResetPin = async () => {
    if (newPin.length < 4) {
      setError('New PIN must be at least 4 digits');
      return;
    }
    try {
      const res = await fetch('/api/auth/reset-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, otp, newPin })
      });
      const data = await res.json();
      if (data.success) {
        setStep('pin_entry');
        setPin('');
        setOtp('');
        setNewPin('');
        setOtpSent(false);
        setError('');
      } else {
        setError(data.error || 'Invalid OTP');
      }
    } catch (e) {
      setError('Network error');
    }
  };

  if (step === 'loading') {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
        <div className="animate-pulse text-xl">Авторизация...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-slate-800 p-8 rounded-3xl shadow-xl w-full max-w-sm text-center"
      >
        <div className="w-16 h-16 bg-indigo-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <Shield className="w-8 h-8 text-indigo-400" />
        </div>
        
        <h1 className="text-2xl font-bold mb-2">
          {step === 'manual_auth' ? (mode === 'register' ? 'Регистрация' : 'Вход') : 
           step === 'set_pin' ? 'Создайте PIN-код' : 
           step === 'forgot_pin' ? 'Восстановление PIN' : 
           'Введите PIN-код'}
        </h1>
        <p className="text-slate-400 mb-8 text-sm">
          {step === 'manual_auth' ? (mode === 'register' ? 'Придумайте имя и 6-значный пароль' : 'Введите свои данные') :
           step === 'set_pin' ? 'Для защиты вашего аккаунта' : 
           step === 'forgot_pin' ? 'Мы отправим код в Telegram' : 
           'Добро пожаловать назад'}
        </p>

        {error && (
          <div className="bg-red-500/10 text-red-400 p-3 rounded-xl mb-6 text-sm">
            {error}
          </div>
        )}

        {step === 'manual_auth' && (
          <div className="space-y-4">
            <div className="flex bg-slate-900 rounded-xl p-1 mb-4">
              <button
                onClick={() => setMode('login')}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${mode === 'login' ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                Вход
              </button>
              <button
                onClick={() => setMode('register')}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${mode === 'register' ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                Регистрация
              </button>
            </div>

            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                type="text"
                placeholder="Имя пользователя"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 pl-12 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            <div className="relative">
              <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                type="password"
                placeholder="6-значный пароль"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 pl-12 text-center text-2xl tracking-[0.5em] focus:outline-none focus:border-indigo-500 transition-colors"
                maxLength={6}
              />
            </div>

            <button
              onClick={handleManualAuth}
              className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-4 rounded-xl transition-colors shadow-lg shadow-indigo-500/20"
            >
              {mode === 'register' ? 'Зарегистрироваться' : 'Войти'}
            </button>
          </div>
        )}

        {step === 'pin_entry' && (
          <div className="space-y-4">
            <input
              type="password"
              placeholder="PIN-код"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-center text-2xl tracking-[0.5em] focus:outline-none focus:border-indigo-500 transition-colors"
              maxLength={6}
            />
            <button
              onClick={handlePinSubmit}
              className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-4 rounded-xl transition-colors"
            >
              Войти
            </button>
            <button
              onClick={() => setStep('forgot_pin')}
              className="text-sm text-slate-400 hover:text-white transition-colors mt-4"
            >
              Забыли PIN?
            </button>
          </div>
        )}

        {step === 'set_pin' && (
          <div className="space-y-4">
            <input
              type="password"
              placeholder="Новый PIN-код"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-center text-2xl tracking-[0.5em] focus:outline-none focus:border-indigo-500 transition-colors"
              maxLength={6}
            />
            <button
              onClick={handleSetPin}
              className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-4 rounded-xl transition-colors"
            >
              Сохранить
            </button>
          </div>
        )}

        {step === 'forgot_pin' && (
          <div className="space-y-4">
            {!otpSent ? (
              <>
                <button
                  onClick={handleForgotPin}
                  className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-4 rounded-xl transition-colors"
                >
                  Получить код в Telegram
                </button>
                <button
                  onClick={() => setStep('pin_entry')}
                  className="text-sm text-slate-400 hover:text-white transition-colors mt-4"
                >
                  Назад
                </button>
              </>
            ) : (
              <>
                <input
                  type="text"
                  placeholder="6-значный код из бота"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-center tracking-widest focus:outline-none focus:border-indigo-500 transition-colors"
                  maxLength={6}
                />
                <input
                  type="password"
                  placeholder="Новый PIN-код"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-center text-2xl tracking-[0.5em] focus:outline-none focus:border-indigo-500 transition-colors mt-4"
                  maxLength={6}
                />
                <button
                  onClick={handleResetPin}
                  className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-4 rounded-xl transition-colors mt-4"
                >
                  Сбросить PIN
                </button>
              </>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}
