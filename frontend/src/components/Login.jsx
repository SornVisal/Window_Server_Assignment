import { FaEye, FaEyeSlash } from "react-icons/fa";
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom';
import { sessionManager } from '../utils/sessionManager';

// Password strength validation
const validatePassword = (pwd) => {
  return {
    minLength: pwd.length >= 12,
    hasUppercase: /[A-Z]/.test(pwd),
    hasLowercase: /[a-z]/.test(pwd),
    hasNumber: /[0-9]/.test(pwd),
    hasSpecial: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd),
  };
};

const isPasswordValid = (pwd) => {
  const checks = validatePassword(pwd);
  return Object.values(checks).every(check => check === true);
};

export default function Login() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [passwordChecks, setPasswordChecks] = useState(null);

  // Ensure body can scroll (clear any overflow:hidden from other components)
  useEffect(() => {
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
    
    return () => {
      // Keep it clean on unmount too
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    };
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    
    // Validate password strength on registration
    if (isRegister) {
      if (!isPasswordValid(password)) {
        setError('❌ Password does not meet all requirements. Please check the requirements below.');
        return;
      }
      if (!name.trim()) {
        setError('❌ Please enter your full name.');
        return;
      }
    }
    
    setIsLoading(true);
    try {
      const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
      const payload = isRegister
        ? { name, email, password, groupId: null }
        : { email, password };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        throw new Error('Failed to parse server response. Please try again.');
      }

      if (!response.ok) {
        let errorMessage = data?.message || data?.error || 'Request failed';
        
        // Provide specific error messages
        if (errorMessage.includes('Invalid credentials')) {
          throw new Error('❌ Invalid email or password. Please check and try again.');
        } else if (errorMessage.includes('Email already exists')) {
          throw new Error('❌ This email is already registered. Please use a different email or sign in.');
        } else if (errorMessage.includes('User not found')) {
          throw new Error('❌ No account found with this email. Please sign up first.');
        } else if (errorMessage.includes('password')) {
          throw new Error(`❌ Password error: ${errorMessage}`);
        } else {
          throw new Error(`❌ ${errorMessage}`);
        }
      }

      // Store credentials and auto-login
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('currentUser', JSON.stringify(data.user));
      sessionManager.setLoginSession();

      navigate('/group');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordChange = (e) => {
    const pwd = e.target.value;
    setPassword(pwd);
    if (isRegister) {
      setPasswordChecks(validatePassword(pwd));
    }
  };

  return (
    <div className="min-h-screen bg-white flex overflow-auto">
      {/* Left Side - Image/Branding */}
      <div className="hidden lg:flex lg:w-[37.5%] relative" style={{backgroundColor: '#831717'}}>
        <div className="absolute inset-0 flex flex-col items-center justify-center p-12">
          <img 
            src="/rupp_logo.png" 
            alt="RUPP Logo" 
            className="w-32 h-32 object-contain mb-8"
          />
          <h1 className="text-4xl font-bold mb-4 text-center text-white">Royal University of Phnom Penh</h1>
          <p className="text-xl text-center text-white opacity-90">Group Submission System</p>
          <div className="mt-12 text-center">
            <p className="text-sm text-white opacity-75">A platform for managing group submissions</p>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-[62.5%] flex items-center justify-center px-6 sm:px-12 lg:px-16">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center mb-8">
            <img 
              src="/rupp_logo.png" 
              alt="RUPP Logo" 
              className="h-16 w-16 object-contain"
            />
          </div>

          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{isRegister ? 'Create Account' : 'Sign In'}</h1>
            <p className="text-gray-600">Group Submission Management System</p>
          </div>

          {isRegister && (
            <div className="mb-6 p-3 rounded text-xs" style={{backgroundColor: '#FEF3C7', border: '1px solid #FCD34D'}}>
              <p style={{color: '#92400E', lineHeight: '1.5'}}>
                <strong>📋 Registration Process:</strong> After creating your account, you'll be automatically logged in. Your account is pending approval from your team leader before you can upload files.
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-1.5">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your full name"
                  className="w-full px-3.5 py-2 border-2 rounded text-gray-900 placeholder-gray-400 focus:outline-none transition bg-white"
                  style={{borderColor: '#E5E7EB'}}
                  onFocus={(e) => e.target.style.borderColor = '#831717'}
                  onBlur={(e) => e.target.style.borderColor = '#E5E7EB'}
                  required={isRegister}
                />
              </div>
            )}


            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-3.5 py-2 border-2 rounded text-gray-900 placeholder-gray-400 focus:outline-none transition bg-white"
                style={{borderColor: '#E5E7EB'}}
                onFocus={(e) => e.target.style.borderColor = '#831717'}
                onBlur={(e) => e.target.style.borderColor = '#E5E7EB'}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={handlePasswordChange}
                  placeholder="Enter your password"
                  className="w-full px-3.5 py-2 border-2 rounded text-gray-900 placeholder-gray-400 focus:outline-none transition bg-white"
                  style={{borderColor: '#E5E7EB'}}
                  onFocus={(e) => e.target.style.borderColor = '#831717'}
                  onBlur={(e) => e.target.style.borderColor = '#E5E7EB'}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
                </button>
              </div>
              
              {/* Password Requirements Checker (only show on register) */}
              {isRegister && password.length > 0 && passwordChecks && (
                <div className="mt-3 p-2.5 rounded text-xs" style={{backgroundColor: '#F5F5F5', border: '1px solid #D1D5DB'}}>
                  <p style={{color: '#6B7280', marginBottom: '0.5rem'}}><strong>Password must contain:</strong></p>
                  <ul style={{color: '#6B7280', lineHeight: '1.4'}}>
                    <li>{passwordChecks.minLength ? '✅' : '❌'} At least 12 characters (current: {password.length})</li>
                    <li>{passwordChecks.hasUppercase ? '✅' : '❌'} At least one uppercase letter (A-Z)</li>
                    <li>{passwordChecks.hasLowercase ? '✅' : '❌'} At least one lowercase letter (a-z)</li>
                    <li>{passwordChecks.hasNumber ? '✅' : '❌'} At least one number (0-9)</li>
                    <li>{passwordChecks.hasSpecial ? '✅' : '❌'} At least one special character (!@#$%^&* etc)</li>
                  </ul>
                </div>
              )}
            </div>

            {!isRegister && (
              <div className="flex items-center pt-1">
                <input
                  type="checkbox"
                  id="rememberMe"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded cursor-pointer"
                  style={{accentColor: '#831717'}}
                />
                <label htmlFor="rememberMe" className="ml-2 text-sm text-gray-700 cursor-pointer">
                  Remember me
                </label>
              </div>
            )}

            {error && (
              <div className={`p-3 rounded text-sm font-medium`} style={{
                backgroundColor: error.includes('✅') ? '#D1FAE5' : '#FEE2E2',
                borderLeft: error.includes('✅') ? '4px solid #10B981' : '4px solid #831717',
                color: error.includes('✅') ? '#047857' : '#991B1B'
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || (isRegister && !isPasswordValid(password))}
              className="w-full mt-6 px-4 py-2 rounded font-semibold text-white transition disabled:opacity-50 disabled:cursor-not-allowed"
              style={{backgroundColor: '#831717'}}
              onMouseOver={(e) => !isLoading && !(isRegister && !isPasswordValid(password)) && (e.target.style.backgroundColor = '#6B1214')}
              onMouseOut={(e) => e.target.style.backgroundColor = '#831717'}
              title={isRegister && !isPasswordValid(password) ? 'Password does not meet all requirements' : ''}
            >
              {isLoading ? 'Signing in...' : isRegister ? 'Create Account' : 'Sign in'}
            </button>

            {/* Security Notice */}
            <div className="mt-4 p-3 rounded text-xs" style={{backgroundColor: '#F0F9FF', border: '1px solid #BFDBFE'}}>
              <p style={{color: '#1E40AF', lineHeight: '1.5'}}>
                <strong>🔒 Account Security:</strong> For your protection, you can only attempt to sign in 5 times within 15 minutes. After 5 failed attempts, please wait 15 minutes before trying again.
              </p>
            </div>
          </form>

          {/* Links */}
          <div className="mt-6 space-y-4 text-sm">
            {!isRegister && (
              <p className="text-xs text-gray-600 leading-relaxed text-center">
                By clicking Sign in, you agree to our<br />
                <a href="#" className="font-semibold hover:opacity-80" style={{color: '#831717'}}>Terms & Conditions</a> and <a href="#" className="font-semibold hover:opacity-80" style={{color: '#831717'}}>Privacy Policy</a>
              </p>
            )}

            <div className="border-t" style={{borderColor: '#E5E7EB'}}></div>

            <p className="text-gray-700 text-center">
              {isRegister ? 'Already have an account? ' : 'Don\'t have an account? '}
              <button
                type="button"
                onClick={() => {
                  setIsRegister(!isRegister);
                  setError('');
                  setPassword('');
                  setPasswordChecks(null);
                  setName('');
                }}
                className="font-semibold hover:opacity-80"
                style={{color: '#831717'}}
              >
                {isRegister ? 'Sign in' : 'Sign up'}
              </button>
            </p>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t space-y-4 text-center text-xs text-gray-500" style={{borderColor: '#E5E7EB'}}>
            <div className="p-3 rounded" style={{backgroundColor: '#F3F4F6', border: '1px solid #E5E7EB'}}>
              <p style={{color: '#4B5563', lineHeight: '1.5'}}>
                <strong>🔐 Security Tips:</strong>
              </p>
              <ul style={{color: '#6B7280', lineHeight: '1.6', marginTop: '0.5rem', textAlign: 'left', fontSize: '0.75rem'}}>
                <li>✓ Use strong passwords (12+ characters, mixed case, numbers, symbols)</li>
                <li>✓ Never share your login credentials</li>
                <li>✓ Clear browser cache if using public computers</li>
                <li>✓ Automatically logged out after 5 minutes of inactivity</li>
              </ul>
            </div>
            <p>© 2026 Royal University of Phnom Penh</p>
          </div>
        </div>
      </div>
    </div>
  )
}
