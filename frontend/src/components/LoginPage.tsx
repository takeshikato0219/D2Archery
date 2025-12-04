import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import { useAuth } from '../contexts/AuthContext';
import { Target, User, FlaskConical, Mail, Eye, EyeOff, UserPlus } from 'lucide-react';

interface GoogleCredential {
  sub: string;
  email: string;
  name: string;
  picture?: string;
}

type AuthMode = 'login' | 'register';

export function LoginPage() {
  const { t } = useTranslation();
  const { login, emailLogin, emailRegister } = useAuth();
  const [demoLoading, setDemoLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const handleGoogleSuccess = async (credentialResponse: { credential?: string }) => {
    if (!credentialResponse.credential) return;

    try {
      const decoded = jwtDecode<GoogleCredential>(credentialResponse.credential);
      await login({
        googleId: decoded.sub,
        email: decoded.email,
        name: decoded.name,
        avatarUrl: decoded.picture,
      });
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  const handleDemoLogin = async () => {
    setDemoLoading(true);
    try {
      // デモユーザーIDを永続化して同じユーザーとしてログインできるようにする
      let demoUserId = localStorage.getItem('demo-user-id');
      if (!demoUserId) {
        demoUserId = 'demo-user-' + Date.now();
        localStorage.setItem('demo-user-id', demoUserId);
      }
      await login({
        googleId: demoUserId,
        email: 'demo@d2archery.app',
        name: 'デモユーザー',
        avatarUrl: undefined,
      });
    } catch (error) {
      console.error('Demo login error:', error);
    } finally {
      setDemoLoading(false);
    }
  };

  // テストユーザーでログイン（データ入りのアカウント）
  const handleTestLogin = async () => {
    setTestLoading(true);
    try {
      await login({
        googleId: 'test-user-fixed',
        email: 'test@d2archery.app',
        name: 'テストユーザー',
        avatarUrl: undefined,
      });
    } catch (error) {
      console.error('Test login error:', error);
    } finally {
      setTestLoading(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setEmailLoading(true);

    try {
      if (authMode === 'login') {
        await emailLogin(email, password);
      } else {
        if (!name.trim()) {
          setError('名前を入力してください');
          setEmailLoading(false);
          return;
        }
        if (password.length < 6) {
          setError('パスワードは6文字以上必要です');
          setEmailLoading(false);
          return;
        }
        await emailRegister(email, password, name);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '認証に失敗しました';
      setError(message);
    } finally {
      setEmailLoading(false);
    }
  };

  const hasGoogleClientId = !!import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const isProduction = !import.meta.env.DEV;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-white px-4">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-600 rounded-full mb-4">
          <Target className="w-12 h-12 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">D2 Archery</h1>
        <p className="text-gray-600">Your AI Coaching Companion</p>
      </div>

      <div className="card p-8 w-full max-w-sm">
        <h2 className="text-xl font-semibold text-center mb-6">
          {authMode === 'login' ? t('auth.login') : '新規登録'}
        </h2>

        {hasGoogleClientId && (
          <div className="flex justify-center mb-4">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => console.error('Login Failed')}
              theme="outline"
              size="large"
              text="signin_with"
              shape="rectangular"
            />
          </div>
        )}

        {(hasGoogleClientId || isProduction) && (
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">または</span>
            </div>
          </div>
        )}

        {isProduction && (
          <form onSubmit={handleEmailSubmit} className="space-y-4 mb-4">
            {authMode === 'register' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  お名前
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="山田 太郎"
                  required
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                メールアドレス
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="example@email.com"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                パスワード
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder={authMode === 'register' ? '6文字以上' : '••••••'}
                  required
                  minLength={authMode === 'register' ? 6 : undefined}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</p>
            )}

            <button
              type="submit"
              disabled={emailLoading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {authMode === 'login' ? (
                <>
                  <Mail className="w-5 h-5" />
                  {emailLoading ? '読み込み中...' : 'メールでログイン'}
                </>
              ) : (
                <>
                  <UserPlus className="w-5 h-5" />
                  {emailLoading ? '読み込み中...' : '新規登録'}
                </>
              )}
            </button>

            <p className="text-center text-sm text-gray-600">
              {authMode === 'login' ? (
                <>
                  アカウントをお持ちでないですか？{' '}
                  <button
                    type="button"
                    onClick={() => { setAuthMode('register'); setError(''); }}
                    className="text-blue-600 hover:underline font-medium"
                  >
                    新規登録
                  </button>
                </>
              ) : (
                <>
                  既にアカウントをお持ちですか？{' '}
                  <button
                    type="button"
                    onClick={() => { setAuthMode('login'); setError(''); }}
                    className="text-blue-600 hover:underline font-medium"
                  >
                    ログイン
                  </button>
                </>
              )}
            </p>
          </form>
        )}

        {!isProduction && (
          <>
            <button
              onClick={handleDemoLogin}
              disabled={demoLoading || testLoading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              <User className="w-5 h-5" />
              {demoLoading ? '読み込み中...' : 'デモモードで試す'}
            </button>

            <button
              onClick={handleTestLogin}
              disabled={demoLoading || testLoading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 mt-3 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              <FlaskConical className="w-5 h-5" />
              {testLoading ? '読み込み中...' : 'テストユーザーで試す（データあり）'}
            </button>
          </>
        )}

        <p className="text-xs text-gray-500 text-center mt-6">
          {isProduction
            ? 'ログインすることで、サービス利用規約とプライバシーポリシーに同意したものとみなされます。'
            : 'デモモードではデータはローカルに保存されます。'}
        </p>
      </div>

      <div className="mt-8 text-center">
        <p className="text-sm text-gray-500">
          Powered by AI Coaches
        </p>
      </div>
    </div>
  );
}
