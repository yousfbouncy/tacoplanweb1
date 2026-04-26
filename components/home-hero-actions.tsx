'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function HomeHeroActions() {
  const apkHref = '/tacoplan.apk';

  return (
    <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start pt-4">
      <Button
        asChild
        size="lg"
        className="bg-white text-blue-800 hover:bg-blue-50 text-lg px-8 py-7 rounded-2xl shadow-xl transition-all hover:scale-105 active:scale-95"
      >
        <a href={apkHref} download>
          Descargar APK
        </a>
      </Button>
      <Link href="/planes">
        <Button
          size="lg"
          variant="outline"
          className="border-blue-400 bg-transparent text-white hover:bg-white/10 hover:text-white text-lg px-8 py-7 rounded-2xl backdrop-blur-sm"
        >
          Ver planes
        </Button>
      </Link>
    </div>
  );
}

export function HomeFinalCtaButton() {
  const apkHref = '/tacoplan.apk';

  return (
    <Button
      asChild
      size="lg"
      className="bg-white text-blue-600 hover:bg-blue-50 text-xl px-12 py-8 rounded-2xl shadow-2xl transition-all hover:scale-105"
    >
      <a href={apkHref} download>
        Descargar APK
      </a>
    </Button>
  );
}
