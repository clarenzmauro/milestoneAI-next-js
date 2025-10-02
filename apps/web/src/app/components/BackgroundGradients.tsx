export default function BackgroundGradients() {
  return (
    <>
      <div
        className="pointer-events-none fixed inset-0"
        aria-hidden="true"
        style={{
          background:
            'radial-gradient(1200px 600px at 50% -10%, rgba(94,176,239,0.25), rgba(0,0,0,0))',
        }}
      />
      <div
        className="pointer-events-none fixed inset-0"
        aria-hidden="true"
        style={{
          background:
            'radial-gradient(800px 400px at 90% 10%, rgba(34,211,238,0.20), rgba(0,0,0,0))',
        }}
      />
      <div
        className="pointer-events-none fixed inset-0"
        aria-hidden="true"
        style={{
          background:
            'linear-gradient(to bottom, rgba(255,255,255,0.002), rgba(0,0,0,0) 20%, rgba(0,0,0,0) 80%, rgba(255,255,255,0.002))',
        }}
      />
    </>
  );
}