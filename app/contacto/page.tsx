'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, MessageSquare, Clock } from 'lucide-react';

export default function ContactoPage() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    asunto: '',
    mensaje: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    await new Promise(resolve => setTimeout(resolve, 1000));

    setSuccess(true);
    setLoading(false);
    setFormData({
      nombre: '',
      email: '',
      asunto: '',
      mensaje: '',
    });

    setTimeout(() => setSuccess(false), 5000);
  };

  return (
    <div className="bg-white py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Contacto
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Estamos aquí para ayudarte. Ponte en contacto con nuestro equipo de soporte
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-12">
          <Card>
            <CardHeader>
              <Mail className="h-10 w-10 text-blue-600 mb-2" />
              <CardTitle>Email</CardTitle>
              <CardDescription>
                Envíanos un correo electrónico
              </CardDescription>
            </CardHeader>
            <CardContent>
              <a
                href="mailto:soporte@tacoplan.es"
                className="text-blue-600 hover:underline font-medium"
              >
                soporte@tacoplan.es
              </a>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Clock className="h-10 w-10 text-green-600 mb-2" />
              <CardTitle>Horario</CardTitle>
              <CardDescription>
                Horario de atención
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700">Lunes a Viernes</p>
              <p className="text-gray-700">9:00 - 18:00 (CET)</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <MessageSquare className="h-10 w-10 text-purple-600 mb-2" />
              <CardTitle>Respuesta</CardTitle>
              <CardDescription>
                Tiempo de respuesta
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700">Respondemos en menos de 24 horas laborables</p>
            </CardContent>
          </Card>
        </div>

        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Envíanos un Mensaje</CardTitle>
              <CardDescription>
                Completa el formulario y nos pondremos en contacto contigo lo antes posible
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <Label htmlFor="nombre">Nombre Completo</Label>
                  <Input
                    id="nombre"
                    type="text"
                    placeholder="Tu nombre"
                    value={formData.nombre}
                    onChange={(e) =>
                      setFormData({ ...formData, nombre: e.target.value })
                    }
                    required
                    disabled={loading}
                  />
                </div>

                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="tu@email.com"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    required
                    disabled={loading}
                  />
                </div>

                <div>
                  <Label htmlFor="asunto">Asunto</Label>
                  <Input
                    id="asunto"
                    type="text"
                    placeholder="¿En qué podemos ayudarte?"
                    value={formData.asunto}
                    onChange={(e) =>
                      setFormData({ ...formData, asunto: e.target.value })
                    }
                    required
                    disabled={loading}
                  />
                </div>

                <div>
                  <Label htmlFor="mensaje">Mensaje</Label>
                  <Textarea
                    id="mensaje"
                    placeholder="Escribe tu mensaje aquí..."
                    rows={6}
                    value={formData.mensaje}
                    onChange={(e) =>
                      setFormData({ ...formData, mensaje: e.target.value })
                    }
                    required
                    disabled={loading}
                  />
                </div>

                {success && (
                  <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
                    Mensaje enviado correctamente. Te responderemos pronto.
                  </div>
                )}

                <Button type="submit" className="w-full" size="lg" disabled={loading}>
                  {loading ? 'Enviando...' : 'Enviar Mensaje'}
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="mt-8 text-center text-gray-600">
            <p>
              También puedes escribirnos directamente a{' '}
              <a
                href="mailto:soporte@tacoplan.es"
                className="text-blue-600 hover:underline font-medium"
              >
                soporte@tacoplan.es
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
