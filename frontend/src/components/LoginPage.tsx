import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import { useAuth } from '../contexts/AuthContext';
import { Target, User, FlaskConical } from 'lucide-react';

interface GoogleCredential {
  sub: string;
  email: string;
  name: string;
  picture?: string;
}

export function LoginPage() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const [demoLoading, setDemoLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);

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

  const hasGoogleClientId = !!import.meta.env.VITE_GOOGLE_CLIENT_ID;

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
          {t('auth.login')}
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

        {hasGoogleClientId && (
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">または</span>
            </div>
          </div>
        )}

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

        <p className="text-xs text-gray-500 text-center mt-6">
          {hasGoogleClientId
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
