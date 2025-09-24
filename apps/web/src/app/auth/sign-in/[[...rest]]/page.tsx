import { SignIn } from '@clerk/nextjs';
import BackgroundGradients from '../../../components/BackgroundGradients';

export default function AuthCatchAllPage() {
  return (
    <main
      className="relative overflow-hidden"
      style={{ backgroundColor: 'var(--bg-deep)', minHeight: '100dvh' }}
    >
      <BackgroundGradients />

      <div
        className="relative mx-auto flex max-w-7xl items-center justify-center px-6 py-12"
        style={{ minHeight: '100dvh' }}
      >
        <SignIn
          path="/auth/sign-in"
          routing="path"
          signUpUrl="/auth/sign-up"
          forceRedirectUrl="/app"
        />
      </div>
    </main>
  );
}
