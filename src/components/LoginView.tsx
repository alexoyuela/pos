import React, { useState, useEffect } from 'react';
import { UserProfile, UserAccount } from '../types';
import { StorageService, INITIAL_USER_ACCOUNTS } from '../services/storageService';
import { AlertCircle, Eye, EyeOff, ShieldCheck, KeyRound, UserCheck } from 'lucide-react';

interface LoginViewProps {
  onLoginSuccess: (user: UserProfile) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<UserAccount[]>(INITIAL_USER_ACCOUNTS);
  const [showCredentialsHint, setShowCredentialsHint] = useState(true);

  useEffect(() => {
    StorageService.getUsers().then((res) => {
      if (res && res.length > 0) {
        setAccounts(res);
      }
    });
  }, []);

  const handleFillCredentials = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    setErrorMsg('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    const uClean = username.trim();
    const pClean = password.trim();

    try {
      // 1. Try server API login
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: uClean, password: pClean })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          StorageService.setActiveUser(data.user);
          await StorageService.recordLoginLog({
            fecha: new Date().toISOString().split('T')[0],
            hora: new Date().toTimeString().split(' ')[0],
            usuario: data.user.username,
            nombre: data.user.name,
            rol: data.user.role,
            estado: 'Exitoso',
            detalle: `Inicio de sesión exitoso como ${data.user.name}`
          });
          onLoginSuccess(data.user);
          return;
        }
      }

      // 2. Offline Fallback Validation using stored user accounts + flexible PINs
      let user: UserProfile | null = null;
      const storedUsers = await StorageService.getUsers();
      const matched = storedUsers.find((acc) => {
        const uMatches = acc.username.toLowerCase() === uClean.toLowerCase();
        if (!uMatches) return false;
        if (acc.pin === pClean) return true;
        // User friendly default pins
        if (uClean.toLowerCase() === 'admin' && (pClean === 'admin' || pClean === '1234' || pClean === 'Mprietro01' || pClean === 'Mprieto01' || pClean === 'admin123')) return true;
        if (uClean.toLowerCase().startsWith('user') && (pClean === '1234' || pClean.toLowerCase() === uClean.toLowerCase() || pClean === acc.pin)) return true;
        return false;
      });

      if (matched) {
        user = {
          username: matched.username,
          name: matched.name,
          role: matched.role,
          cashierNumber: matched.cashierNumber
        };
      }

      if (user) {
        StorageService.setActiveUser(user);
        await StorageService.recordLoginLog({
          fecha: new Date().toISOString().split('T')[0],
          hora: new Date().toTimeString().split(' ')[0],
          usuario: user.username,
          nombre: user.name,
          rol: user.role,
          estado: 'Exitoso',
          detalle: `Inicio de sesión (modo local/offline)`
        });
        onLoginSuccess(user);
      } else {
        setErrorMsg('Usuario o contraseña no reconocidos. Ingrese con usuario "admin" y contraseña "admin", o consulte la guía inferior.');
        await StorageService.recordLoginLog({
          fecha: new Date().toISOString().split('T')[0],
          hora: new Date().toTimeString().split(' ')[0],
          usuario: uClean,
          nombre: 'Intento fallido',
          rol: 'desconocido',
          estado: 'Fallido',
          detalle: 'Credenciales erróneas'
        });
      }
    } catch {
      // Offline fallback on network failure
      const storedUsers = await StorageService.getUsers();
      const matched = storedUsers.find((acc) => {
        const uMatches = acc.username.toLowerCase() === uClean.toLowerCase();
        if (!uMatches) return false;
        if (acc.pin === pClean) return true;
        if (uClean.toLowerCase() === 'admin' && (pClean === 'admin' || pClean === '1234' || pClean === 'Mprietro01' || pClean === 'Mprieto01')) return true;
        if (uClean.toLowerCase().startsWith('user') && (pClean === '1234' || pClean.toLowerCase() === uClean.toLowerCase() || pClean === acc.pin)) return true;
        return false;
      });

      if (matched) {
        const user: UserProfile = {
          username: matched.username,
          name: matched.name,
          role: matched.role,
          cashierNumber: matched.cashierNumber
        };
        StorageService.setActiveUser(user);
        onLoginSuccess(user);
      } else {
        setErrorMsg('Modo fuera de línea: use usuario "admin" con clave "admin".');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f3f4f6] text-[#111827] flex flex-col items-center justify-center p-4 sm:p-6 select-none font-sans">
      <div className="w-full max-w-md flex flex-col items-center">
        
        {/* Brand Icon & Header */}
        <div className="flex flex-col items-center mb-5 text-center">
          <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-tr from-[#ffaa3b] to-[#f97316] border-[3px] border-[#1e293b] rounded-3xl flex items-center justify-center shadow-xl mb-3">
            <span className="text-4xl">🍔</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-[#111827]">
            Sistema POS
          </h1>
          <p className="text-xs sm:text-sm font-extrabold text-gray-800 uppercase tracking-widest mt-1">
            El Rincón &bull; Cafe, Ron &amp; Sazón
          </p>
        </div>

        {/* Login Form Box */}
        <div className="w-full bg-[#a2a6ab] border-[3px] border-[#1e293b] rounded-[32px] p-6 sm:p-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            
            <div>
              <label className="block text-xs font-black text-gray-900 uppercase tracking-wider mb-1.5">
                Usuario:
              </label>
              <input
                id="login-username"
                type="text"
                value={username}
                onChange={(e) => { setUsername(e.target.value); setErrorMsg(''); }}
                placeholder="admin o user001"
                required
                autoComplete="username"
                className="w-full bg-white text-gray-900 placeholder-gray-400 text-sm font-bold px-4 py-3 rounded-2xl border-2 border-gray-800 focus:outline-none focus:ring-2 focus:ring-[#f97316] transition shadow-inner font-mono"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-black text-gray-900 uppercase tracking-wider">
                  Contraseña / PIN:
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-xs text-gray-800 hover:text-black font-bold flex items-center gap-1 transition"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{showPassword ? 'Ocultar' : 'Ver'}</span>
                </button>
              </div>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setErrorMsg(''); }}
                  placeholder="admin o 1234"
                  required
                  autoComplete="current-password"
                  className="w-full bg-white text-gray-900 placeholder-gray-400 text-sm font-bold px-4 py-3 rounded-2xl border-2 border-gray-800 focus:outline-none focus:ring-2 focus:ring-[#f97316] transition shadow-inner pr-10 font-mono"
                />
              </div>
            </div>

            {errorMsg && (
              <div className="flex items-start gap-2 p-3 bg-red-100 border-2 border-red-500 text-red-900 rounded-2xl text-xs font-bold shadow-sm animate-fadeIn">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-600 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="pt-2">
              <button
                id="btn-login-submit"
                type="submit"
                disabled={loading}
                className="w-full bg-[#ea580c] hover:bg-[#c2410c] active:scale-[0.99] text-white font-black py-3.5 px-6 rounded-2xl border-2 border-black shadow-lg transition flex items-center justify-center text-sm uppercase tracking-wider gap-2"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{loading ? 'Ingresando...' : 'Iniciar Sesión'}</span>
              </button>
            </div>
          </form>

          {/* Quick Credential Guide & Easy Fill Buttons */}
          <div className="mt-5 pt-4 border-t-2 border-gray-700/60">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-black uppercase text-gray-900 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-[#ea580c]" />
                <span>Acceso Rápido con 1 Clic:</span>
              </span>
              <button
                type="button"
                onClick={() => setShowCredentialsHint(!showCredentialsHint)}
                className="text-[10px] text-gray-800 hover:text-black font-extrabold underline"
              >
                {showCredentialsHint ? 'Ocultar' : 'Ver datos'}
              </button>
            </div>

            {showCredentialsHint && (
              <div className="space-y-1.5 animate-fadeIn">
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleFillCredentials('admin', 'admin')}
                    className="p-2 bg-amber-50 hover:bg-amber-100 border-2 border-amber-600 rounded-xl text-left transition active:scale-95 shadow-xs"
                  >
                    <div className="text-[11px] font-black text-amber-950 flex items-center gap-1">
                      <span>👑 Admin General</span>
                    </div>
                    <div className="text-[10px] text-amber-800 font-mono font-bold">
                      admin / admin
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleFillCredentials('user001', '1234')}
                    className="p-2 bg-white hover:bg-orange-50 border-2 border-gray-700 rounded-xl text-left transition active:scale-95 shadow-xs"
                  >
                    <div className="text-[11px] font-black text-gray-900 flex items-center gap-1">
                      <span>👤 Cajero 1</span>
                    </div>
                    <div className="text-[10px] text-gray-700 font-mono font-bold">
                      user001 / 1234
                    </div>
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-1 pt-0.5">
                  <button
                    type="button"
                    onClick={() => handleFillCredentials('user002', '1234')}
                    className="px-1.5 py-1 bg-white hover:bg-gray-100 border border-gray-600 rounded-lg text-center text-[10px] font-bold text-gray-800 transition active:scale-95"
                  >
                    Cajero 2 (1234)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleFillCredentials('user003', '1234')}
                    className="px-1.5 py-1 bg-white hover:bg-gray-100 border border-gray-600 rounded-lg text-center text-[10px] font-bold text-gray-800 transition active:scale-95"
                  >
                    Cajero 3 (1234)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleFillCredentials('user004', '1234')}
                    className="px-1.5 py-1 bg-white hover:bg-gray-100 border border-gray-600 rounded-lg text-center text-[10px] font-bold text-gray-800 transition active:scale-95"
                  >
                    Cajero 4 (1234)
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Footer label */}
        <div className="mt-4 text-center text-xs font-bold text-gray-800">
          El Rincón Cafe, Ron &amp; Sazón &bull; 2024
        </div>

      </div>
    </div>
  );
};
