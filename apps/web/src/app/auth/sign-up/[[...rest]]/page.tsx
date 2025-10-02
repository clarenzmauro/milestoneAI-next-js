import { SignUp } from '@clerk/nextjs';
import BackgroundGradients from '../../../components/background-gradients';

export default function SignUpCatchAllPage() {
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
        <SignUp
          path="/auth/sign-up"
          routing="path"
          signInUrl="/auth"
          forceRedirectUrl="/app"
        />
      </div>
    </main>
  );
}