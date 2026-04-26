'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { User, Mail, Globe, Map, Route, Calculator, Save, Loader2, Truck, CalendarDays } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function PerfilPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    idioma: 'es',
    tipo_conductor: 'autonomo',
    pais_base: 'España',
    tipo_ruta: 'nacional',
    pref_dietas: 'estandar',
    periodo_calculo: 'mensual'
  });

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
          setLoading(false);
          return;
        }

        setUser(user);
        
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profileError && profileError.code !== 'PGRST116') {
          throw profileError;
        }

        if (profile) {
          setFormData({
            nombre: profile.nombre || user.user_metadata?.nombre || '',
            email: user.email || '',
            idioma: profile.idioma || 'es',
            tipo_conductor: profile.tipo_conductor || 'autonomo',
            pais_base: profile.pais_base || 'España',
            tipo_ruta: profile.tipo_ruta || 'nacional',
            pref_dietas: profile.pref_dietas || 'estandar',
            periodo_calculo: profile.periodo_calculo || 'mensual'
          });
        } else {
          // Si no existe, pre-rellenamos con lo que tengamos de auth
          setFormData(prev => ({
            ...prev,
            nombre: user.user_metadata?.nombre || '',
            email: user.email || ''
          }));
        }
      } catch (error) {
        console.error('Error cargando perfil:', error);
        toast.error('No se pudo cargar el perfil');
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          nombre: formData.nombre,
          email: formData.email,
          idioma: formData.idioma,
          tipo_conductor: formData.tipo_conductor,
          pais_base: formData.pais_base,
          tipo_ruta: formData.tipo_ruta,
          pref_dietas: formData.pref_dietas,
          periodo_calculo: formData.periodo_calculo,
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' });

      if (error) throw error;
      toast.success('Perfil actualizado correctamente');
    } catch (error) {
      console.error('Error guardando perfil:', error);
      toast.error('Error al guardar los cambios');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <Card className="w-full max-w-md text-center py-8">
          <CardHeader>
            <CardTitle>Acceso restringido</CardTitle>
            <CardDescription>Debes iniciar sesión para configurar tu perfil profesional</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/login')} className="w-full bg-blue-600 hover:bg-blue-700">
              Ir al inicio de sesión
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center space-x-4 mb-8">
          <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-200">
            <User className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Mi Perfil Profesional</h1>
            <p className="text-slate-500 text-sm">Configura tu agenda Tacoplan v3</p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Sidebar / Info */}
          <div className="space-y-6">
            <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
              <div className="h-24 bg-gradient-to-r from-blue-600 to-indigo-600"></div>
              <div className="px-6 pb-6 -mt-12 text-center">
                <div className="inline-flex p-1 bg-white rounded-2xl mb-4 shadow-md">
                  <div className="w-20 h-20 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400">
                    <User className="w-10 h-10" />
                  </div>
                </div>
                <h3 className="font-bold text-slate-900 text-lg">{formData.nombre || 'Conductor'}</h3>
                <p className="text-slate-500 text-xs mb-4">{formData.email}</p>
                <div className="inline-flex items-center px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-[10px] font-bold uppercase tracking-wider">
                  Plan Básico
                </div>
              </div>
            </Card>
          </div>

          {/* Formulario Principal */}
          <div className="md:col-span-2 space-y-8">
            <Card className="border-none shadow-sm rounded-2xl">
              <CardHeader>
                <CardTitle className="text-lg">Información Personal</CardTitle>
                <CardDescription>Datos básicos de tu cuenta</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="nombre">Nombre Completo</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                    <Input 
                      id="nombre" 
                      className="pl-10" 
                      placeholder="Tu nombre" 
                      value={formData.nombre}
                      onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">Correo Electrónico</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                    <Input id="email" className="pl-10 bg-slate-50" disabled value={formData.email} />
                  </div>
                  <p className="text-[10px] text-slate-400 italic">El email no puede cambiarse por seguridad.</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm rounded-2xl">
              <CardHeader>
                <CardTitle className="text-lg">Configuración de Ruta</CardTitle>
                <CardDescription>Ajusta Tacoplan a tu forma de trabajar</CardDescription>
              </CardHeader>
              <CardContent className="grid sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-slate-400" /> Idioma
                  </Label>
                  <Select 
                    value={formData.idioma} 
                    onValueChange={(val) => setFormData({...formData, idioma: val})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="es">Español</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="pt">Português</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Map className="w-4 h-4 text-slate-400" /> País Base
                  </Label>
                  <Input 
                    value={formData.pais_base}
                    onChange={(e) => setFormData({...formData, pais_base: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-slate-400" /> Tipo de Conductor
                  </Label>
                  <Select 
                    value={formData.tipo_conductor}
                    onValueChange={(val) => setFormData({...formData, tipo_conductor: val})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="autonomo">Autónomo</SelectItem>
                      <SelectItem value="asalariado">Asalariado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Route className="w-4 h-4 text-slate-400" /> Ruta Habitual
                  </Label>
                  <Select 
                    value={formData.tipo_ruta}
                    onValueChange={(val) => setFormData({...formData, tipo_ruta: val})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nacional">Nacional</SelectItem>
                      <SelectItem value="internacional">Internacional</SelectItem>
                      <SelectItem value="regional">Regional / Local</SelectItem>
                      <SelectItem value="mixto">Mixto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm rounded-2xl">
              <CardHeader>
                <CardTitle className="text-lg">Preferencias de Dietas</CardTitle>
                <CardDescription>Cálculos automáticos de manutención</CardDescription>
              </CardHeader>
              <CardContent className="grid sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Calculator className="w-4 h-4 text-slate-400" /> Tipo de Dieta
                  </Label>
                  <Select 
                    value={formData.pref_dietas}
                    onValueChange={(val) => setFormData({...formData, pref_dietas: val})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="estandar">Convenio Estándar</SelectItem>
                      <SelectItem value="personalizada">Personalizada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <CalendarDays className="w-4 h-4 text-slate-400" /> Periodo Cálculo
                  </Label>
                  <Select 
                    value={formData.periodo_calculo}
                    onValueChange={(val) => setFormData({...formData, periodo_calculo: val})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="semanal">Semanal</SelectItem>
                      <SelectItem value="mensual">Mensual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end pt-4">
              <Button 
                onClick={handleSave} 
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-6 rounded-xl shadow-lg shadow-blue-200 transition-all hover:scale-105"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Guardar Cambios
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
