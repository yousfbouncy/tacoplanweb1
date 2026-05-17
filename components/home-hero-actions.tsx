'use client';

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
  const appStoreHref = 'https://apps.apple.com/es/app/tacoplan/id6767099789';
  const apkHref =
    process.env.NEXT_PUBLIC_APK_URL ||
    'https://dutgxjwfjtqxmqonnjlp.supabase.co/storage/v1/object/public/apk/tacoplan%20version%202.2.2.apk';

  return (
    <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start pt-4">
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            size="lg"
            className="bg-white text-blue-800 hover:bg-blue-50 text-lg px-8 py-7 rounded-2xl shadow-xl transition-all hover:scale-105 active:scale-95"
          >
            Descargar la app
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Descargar Tacoplan</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-5">
                <div className="space-y-2">
                  <p className="text-sm">Tacoplan está disponible en App Store. En Android se descarga como APK.</p>
                  <p className="text-sm">En Android es normal ver un aviso de seguridad al descargar/instalar.</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <Button asChild className="w-full sm:w-auto">
                    <a href={appStoreHref} target="_blank" rel="noreferrer">
                      Descargar en App Store
                    </a>
                  </Button>
                  <Button asChild variant="outline" className="w-full sm:w-auto">
                    <a href={apkHref} target="_blank" rel="noreferrer">
                      Descargar APK (Android)
                    </a>
                  </Button>
                </div>

                <div className="space-y-2">
                  <div className="font-semibold text-foreground">📲 Cómo instalar en Android</div>
                  <ol className="list-decimal pl-5 space-y-1 text-sm">
                    <li>Pulsa en “Descargar APK (Android)”.</li>
                    <li>Si aparece un aviso del navegador, pulsa “Descargar de todos modos”.</li>
                    <li>Abre el archivo descargado.</li>
                    <li>Si te lo pide, permite “instalar apps desconocidas”.</li>
                    <li>Instala la app.</li>
                  </ol>
                </div>

                <div className="space-y-2">
                  <div className="font-semibold text-foreground">🔐 Dentro de la app</div>
                  <ul className="list-disc pl-5 space-y-1 text-sm">
                    <li>Pulsa “Registrarse con Google”.</li>
                    <li>Tu cuenta se crea automáticamente.</li>
                  </ul>
                </div>

                <div className="text-sm">
                  App en prueba pero funcional. Tus datos se guardan de forma segura. CUALQUIER ERROR, O COSAS A MEJORAR Y CORREGIR, HAGAMELO SABER CONTACTADOME.
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <Button asChild variant="outline" className="w-full sm:w-auto">
                    <a href="mailto:soporte@tacoplan.es">Email soporte</a>
                  </Button>
                  <Button asChild variant="outline" className="w-full sm:w-auto">
                    <a href="https://wa.me/34614314054" target="_blank" rel="noreferrer">
                      WhatsApp soporte
                    </a>
                  </Button>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
          </AlertDialogFooter>
          <div className="pt-2 text-center text-xs text-muted-foreground">
            Disponible en App Store. Android disponible por APK (próximamente en Google Play).
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export function HomeFinalCtaButton() {
  const appStoreHref = 'https://apps.apple.com/es/app/tacoplan/id6767099789';
  const apkHref =
    process.env.NEXT_PUBLIC_APK_URL ||
    'https://dutgxjwfjtqxmqonnjlp.supabase.co/storage/v1/object/public/apk/tacoplan%20version%202.2.2.apk';

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          size="lg"
          className="bg-white text-blue-600 hover:bg-blue-50 text-xl px-12 py-8 rounded-2xl shadow-2xl transition-all hover:scale-105"
        >
          Descargar la app
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Descargar Tacoplan</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-5">
              <div className="space-y-2">
                <p className="text-sm">Tacoplan está disponible en App Store. En Android se descarga como APK.</p>
                <p className="text-sm">En Android es normal ver un aviso de seguridad al descargar/instalar.</p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <Button asChild className="w-full sm:w-auto">
                  <a href={appStoreHref} target="_blank" rel="noreferrer">
                    Descargar en App Store
                  </a>
                </Button>
                <Button asChild variant="outline" className="w-full sm:w-auto">
                  <a href={apkHref} target="_blank" rel="noreferrer">
                    Descargar APK (Android)
                  </a>
                </Button>
              </div>

              <div className="space-y-2">
                <div className="font-semibold text-foreground">📲 Cómo instalar en Android</div>
                <ol className="list-decimal pl-5 space-y-1 text-sm">
                  <li>Pulsa en “Descargar APK (Android)”.</li>
                  <li>Si aparece un aviso del navegador, pulsa “Descargar de todos modos”.</li>
                  <li>Abre el archivo descargado.</li>
                  <li>Si te lo pide, permite “instalar apps desconocidas”.</li>
                  <li>Instala la app.</li>
                </ol>
              </div>

              <div className="space-y-2">
                <div className="font-semibold text-foreground">🔐 Dentro de la app</div>
                <ul className="list-disc pl-5 space-y-1 text-sm">
                  <li>Pulsa “Registrarse con Google”.</li>
                  <li>Tu cuenta se crea automáticamente.</li>
                </ul>
              </div>

              <div className="text-sm">
                App en prueba pero funcional. Tus datos se guardan de forma segura. CUALQUIER ERROR, O COSAS A MEJORAR Y CORREGIR, HAGAMELO SABER CONTACTADOME.
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <Button asChild variant="outline" className="w-full sm:w-auto">
                  <a href="mailto:soporte@tacoplan.es">Email soporte</a>
                </Button>
                <Button asChild variant="outline" className="w-full sm:w-auto">
                  <a href="https://wa.me/34614314054" target="_blank" rel="noreferrer">
                    WhatsApp soporte
                  </a>
                </Button>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
        </AlertDialogFooter>
        <div className="pt-2 text-center text-xs text-muted-foreground">
          Disponible en App Store. Android disponible por APK (próximamente en Google Play).
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
