import NavBar from './(marketing)/components/nav-bar';
import Hero from './(marketing)/components/hero';
import FeatureCards from './(marketing)/components/feature-cards';
import HowItWorks from './(marketing)/components/how-it-works';
import Footer from './(marketing)/components/footer';

export default function HomePage() {
  return (
    <main style={{ backgroundColor: 'var(--bg-deep)' }}>
      <NavBar />
      <Hero />
      <FeatureCards />
      <HowItWorks />
      <Footer />
    </main>
  );
}

