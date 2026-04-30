import Image from 'next/image'

export function HeroStrip() {
  return (
    <section className="relative overflow-hidden border-b border-stone-200/80">
      <div className="absolute inset-0">
        <Image
          src="https://images.unsplash.com/photo-1600210492486-724fe5c34fb0?auto=format&fit=crop&w=1920&q=80"
          alt="Warm modern interior"
          fill
          className="object-cover object-center"
          priority
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-stone-950/75 via-stone-900/35 to-transparent" />
      </div>
      <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
        <p className="text-xs font-medium uppercase tracking-[0.25em] text-amber-100/90">
          VividHome
        </p>
        <h1 className="mt-4 max-w-xl font-serif text-4xl leading-tight text-white sm:text-5xl">
          Photoreal interiors you can walk through
        </h1>
        <p className="mt-4 max-w-lg text-sm leading-relaxed text-stone-100/95">
          Generate furniture with Meshy, arrange finishes like a designer, then visit your space in
          first-person — calibrated lighting, soft shadows, and HDR reflections.
        </p>
      </div>
    </section>
  )
}
