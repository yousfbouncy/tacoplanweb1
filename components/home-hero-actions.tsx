'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export function HomeHeroActions() {
  const apkHref = process.env.NEXT_PUBLIC_APK_URL || '/tacoplan.apk';

  return (
    <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start pt-4">
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            size="lg"
            className="bg-white text-blue-800 hover:bg-blue-50 text-lg px-8 py-7 rounded-2xl shadow-xl transition-all hover:scale-105 active:scale-95"
          >
            Descargar APK
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Descargar Tacoplan</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  La app de momento es gratuita, en prueba, pero funcional. REGISTRARSE DIRECTAMENTE DANDOLE AL BOTON GOOGLE, REGISTRO CON GOOGLE.
                </p>
                <p>
                  Si encuentras cualquier error o tienes alguna mejora/recomendación, escríbenos a{' '}
                  <a className="underline" href="mailto:soporte@tacoplan.es">
                    soporte@tacoplan.es
                  </a>{' '}
                  o por WhatsApp al{' '}
                  <a className="underline" href="https://wa.me/34614314054" target="_blank" rel="noreferrer">
                    +34 614 314 054
                  </a>
                  .
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction asChild>
              <a href={apkHref} download>
                Descargar
              </a>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
  const apkHref = process.env.NEXT_PUBLIC_APK_URL || '/tacoplan.apk';

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          size="lg"
          className="bg-white text-blue-600 hover:bg-blue-50 text-xl px-12 py-8 rounded-2xl shadow-2xl transition-all hover:scale-105"
        >
          Descargar APK
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Descargar Tacoplan</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>
                La app de momento es gratuita, en prueba, pero funcional. REGISTRARSE DIRECTAMENTE DANDOLE AL BOTON GOOGLE, REGISTRO CON GOOGLE.
              </p>
              <p>
                Si encuentras cualquier error o tienes alguna mejora/recomendación, escríbenos a{' '}
                <a className="underline" href="mailto:soporte@tacoplan.es">
                  soporte@tacoplan.es
                </a>{' '}
                o por WhatsApp al{' '}
                <a className="underline" href="https://wa.me/34614314054" target="_blank" rel="noreferrer">
                  +34 614 314 054
                </a>
                .
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction asChild>
            <a href={apkHref} download>
              Descargar
            </a>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
