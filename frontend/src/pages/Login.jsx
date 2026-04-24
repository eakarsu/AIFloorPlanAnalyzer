import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { login as loginApi, register as registerApi, requestPasswordReset } from '../services/api';
import { Brain, Mail, Lock, User, Loader2, ArrowLeft, Check, X } from 'lucide-react';

const passwordRules = [
  { label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { label: 'Uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { label: 'Lowercase letter', test: (p) => /[a-z]/.test(p) },
  { label: 'Number', test: (p) => /[0-9]/.test(p) },
  { label: 'Special character (!@#$%^&*)', test: (p) => /[!@#$%^&*(),.?":{}|<>]/.test(p) },
];

function PasswordStrength({ password }) {
  const passed = passwordRules.filter((r) => r.test(password)).length;
  const strength = passed === 0 ? 0 : passed <= 2 ? 1 : passed <= 4 ? 2 : 3;
  const labels = ['', 'Weak', 'Medium', 'Strong'];
  const colors = ['bg-gray-200', 'bg-red-500', 'bg-yellow-500', 'bg-green-500'];

  if (!password) return null;

  return (
    <div className="mt-2 space-y-2">
      <div className="flex gap-1">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              i <= strength ? colors[strength] : 'bg-gray-200'
            }`}
          />
        ))}
      </div>
      <div className="flex items-center justify-between">
        <span className={`text-xs font-medium ${
          strength === 1 ? 'text-red-600' : strength === 2 ? 'text-yellow-600' : strength === 3 ? 'text-green-600' : 'text-gray-400'
        }`}>
          {labels[strength]}
        </span>
        <span className="text-xs text-gray-400">{passed}/{passwordRules.length} rules</span>
      </div>
      <ul className="space-y-1">
        {passwordRules.map((rule, i) => {
          const ok = rule.test(password);
          return (
            <li key={i} className={`flex items-center gap-1.5 text-xs ${ok ? 'text-green-600' : 'text-gray-400'}`}>
              {ok ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
              {rule.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function Login() {
  const [mode, setMode] = useState('login'); // 'login' | 'register' | 'forgot' | 'forgot-sent'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const isRegister = mode === 'register';

  const allPasswordRulesPassed = useMemo(
    () => passwordRules.every((r) => r.test(password)),
    [password]
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let response;
      if (isRegister) {
        if (!allPasswordRulesPassed) {
          setError('Password does not meet all requirements');
          setLoading(false);
          return;
        }
        response = await registerApi(email, password, name);
      } else {
        response = await loginApi(email, password);
      }
      login(response.data.user, response.data.token);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await requestPasswordReset(email);
      setMode('forgot-sent');
    } catch (err) {
      setError(err.response?.data?.error || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fillDemoCredentials = () => {
    setEmail('demo@example.com');
    setPassword('password123');
    setName('Demo User');
  };

  const switchMode = (newMode) => {
    setMode(newMode);
    setError('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">
      <div className="w-full max-w-md p-8">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-100 rounded-full mb-4">
              <Brain className="h-8 w-8 text-indigo-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800">AI Floor Plan Analyzer</h1>
            <p className="text-gray-500 mt-2">
              {mode === 'login' && 'Welcome back! Please login.'}
              {mode === 'register' && 'Create your account'}
              {mode === 'forgot' && 'Reset your password'}
              {mode === 'forgot-sent' && 'Check your email'}
            </p>
          </div>

          {/* Forgot Password - Sent confirmation */}
          {mode === 'forgot-sent' && (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <Mail className="h-8 w-8 text-green-600" />
              </div>
              <p className="text-gray-600">
                If an account exists with <strong>{email}</strong>, a password reset link has been sent.
              </p>
              <p className="text-sm text-gray-500">
                Check your email and follow the instructions to reset your password.
              </p>
              <button
                onClick={() => switchMode('login')}
                className="text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1 mx-auto"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Login
              </button>
            </div>
          )}

          {/* Forgot Password Form */}
          {mode === 'forgot' && (
            <>
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
                  {error}
                </div>
              )}
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                      placeholder="you@example.com"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin h-5 w-5 mr-2" />
                      Sending...
                    </>
                  ) : (
                    'Send Reset Link'
                  )}
                </button>
              </form>

              <div className="mt-6 text-center">
                <button
                  onClick={() => switchMode('login')}
                  className="text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1 mx-auto"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Login
                </button>
              </div>
            </>
          )}

          {/* Login / Register Form */}
          {(mode === 'login' || mode === 'register') && (
            <>
              {/* Demo credentials button */}
              <button
                type="button"
                onClick={fillDemoCredentials}
                className="w-full mb-6 py-3 px-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-medium rounded-lg hover:from-green-600 hover:to-emerald-600 transition-all duration-200 shadow-md hover:shadow-lg"
              >
                Fill Demo Credentials
              </button>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {isRegister && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                        placeholder="Your name"
                        required={isRegister}
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                      placeholder="you@example.com"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                      placeholder="Enter your password"
                      required
                    />
                  </div>
                  {isRegister && <PasswordStrength password={password} />}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin h-5 w-5 mr-2" />
                      {isRegister ? 'Creating Account...' : 'Logging in...'}
                    </>
                  ) : (
                    isRegister ? 'Create Account' : 'Login'
                  )}
                </button>
              </form>

              {/* Forgot password link (login mode only) */}
              {mode === 'login' && (
                <div className="mt-4 text-center">
                  <button
                    onClick={() => switchMode('forgot')}
                    className="text-sm text-gray-500 hover:text-indigo-600"
                  >
                    Forgot your password?
                  </button>
                </div>
              )}

              <div className="mt-6 text-center">
                <button
                  onClick={() => switchMode(isRegister ? 'login' : 'register')}
                  className="text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  {isRegister
                    ? 'Already have an account? Login'
                    : "Don't have an account? Register"}
                </button>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200">
                <p className="text-center text-sm text-gray-500">
                  Demo: demo@example.com / password123
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
