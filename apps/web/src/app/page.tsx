import NavBar from './(marketing)/components/nav-bar';
import Hero from './(marketing)/components/hero';
import FeatureCards from './(marketing)/components/feature-cards';
import HowItWorks from './(marketing)/components/how-it-works';
import Footer from './(marketing)/components/footer';
import BackgroundGradients from './components/background-gradients';

export default function HomePage() {
  return (
    <main className="relative overflow-hidden" style={{ backgroundColor: 'var(--bg-deep)' }}>
      <BackgroundGradients />

      <NavBar />
      <Hero />
      <FeatureCards />
      <HowItWorks />
      <Footer />
    </main>
  );
}

