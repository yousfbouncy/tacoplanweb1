'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Bell, ChevronRight, LogOut, Menu, PanelLeftClose, PanelLeftOpen, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';
import { useBusinessData } from '@/features/business/business-context';
import { businessCopy } from '@/features/business/copy';
import { businessNavigation, getBusinessPageMeta } from '@/features/business/navigation';

export function BusinessShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut, user } = useAuth();
  const { authLoading, dataLoading, businessProfile, pendingTasks, stats, statusMessage } = useBusinessData();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const pageMeta = useMemo(() => getBusinessPageMeta(pathname), [pathname]);
  const userName = user?.email?.split('@')[0] || 'Usuario';
  const businessName = businessProfile?.business_name || 'Mi negocio';

  if (authLoading || dataLoading) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
            <div className="hidden h-[560px] animate-pulse rounded-3xl bg-slate-200 lg:block" />
            <div className="space-y-6">
              <div className="h-20 animate-pulse rounded-3xl bg-slate-200" />
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="h-32 animate-pulse rounded-3xl bg-slate-200" />
                ))}
              </div>
              <div className="h-[420px] animate-pulse rounded-3xl bg-slate-200" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-6 py-12">
        <Card className="w-full max-w-lg rounded-3xl border-none shadow-sm">
          <CardHeader>
            <CardTitle>Acceso restringido</CardTitle>
            <CardDescription>Inicia sesión para acceder al módulo Mi negocio.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/login')} className="w-full">
              Ir al inicio de sesión
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-6 lg:grid-cols-[auto_minmax(0,1fr)]">
          <div className="hidden lg:block">
            <div
              className={cn(
                'sticky top-24 h-[calc(100vh-7.5rem)] rounded-3xl border border-slate-200 bg-white shadow-sm transition-all',
                sidebarCollapsed ? 'w-[96px]' : 'w-[280px]'
              )}
            >
              <SidebarContent collapsed={sidebarCollapsed} onLinkClick={undefined} />
            </div>
          </div>

          <div className="min-w-0 space-y-6">
            <div className="sticky top-20 z-30 rounded-3xl border border-slate-200 bg-white/95 shadow-sm backdrop-blur">
              <div className="flex flex-col gap-4 p-4 sm:p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex items-center gap-2">
                      <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
                        <SheetTrigger asChild>
                          <Button variant="outline" size="icon" className="lg:hidden">
                            <Menu className="h-5 w-5" />
                          </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="w-[320px] p-0 sm:max-w-none">
                          <SheetHeader className="border-b px-6 py-5">
                            <SheetTitle>Mi negocio</SheetTitle>
                            <SheetDescription>Navega entre los módulos del panel.</SheetDescription>
                          </SheetHeader>
                          <SidebarContent collapsed={false} onLinkClick={() => setMobileSidebarOpen(false)} />
                        </SheetContent>
                      </Sheet>

                      <Button
                        variant="outline"
                        size="icon"
                        className="hidden lg:inline-flex"
                        onClick={() => setSidebarCollapsed((current) => !current)}
                      >
                        {sidebarCollapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
                      </Button>
                    </div>

                    <div className="min-w-0">
                      <Breadcrumb>
                        <BreadcrumbList>
                          <BreadcrumbItem>
                            <BreadcrumbLink asChild>
                              <Link href="/mi-negocio/resumen">Mi negocio</Link>
                            </BreadcrumbLink>
                          </BreadcrumbItem>
                          <BreadcrumbSeparator />
                          <BreadcrumbItem>
                            <BreadcrumbPage>{pageMeta.title}</BreadcrumbPage>
                          </BreadcrumbItem>
                        </BreadcrumbList>
                      </Breadcrumb>

                      <div className="mt-2 flex flex-wrap items-center gap-3">
                        <h1 className="truncate text-2xl font-bold text-slate-900">{pageMeta.title}</h1>
                        <Badge
                          variant={pageMeta.available ? 'default' : 'outline'}
                          className={pageMeta.available ? 'bg-blue-600 hover:bg-blue-600' : 'border-slate-200 text-slate-600'}
                        >
                          {pageMeta.available ? 'Operativo' : pageMeta.phase}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm text-slate-500">{businessCopy.moduleDescription}</p>
                    </div>
                  </div>

                  <div className="hidden items-center gap-2 lg:flex">
                    <Button asChild className="rounded-2xl">
                      <Link href="/mi-negocio/facturas/nueva">
                        <Plus className="mr-2 h-4 w-4" />
                        Nueva factura
                      </Link>
                    </Button>

                    <Button variant="outline" size="icon" className="relative rounded-2xl">
                      <Bell className="h-5 w-5" />
                      {stats.notificationsCount > 0 ? (
                        <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-semibold text-white">
                          {stats.notificationsCount}
                        </span>
                      ) : null}
                    </Button>

                    <div className="hidden items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 xl:flex">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback>{getInitials(userName)}</AvatarFallback>
                      </Avatar>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-slate-900">{userName}</p>
                        <p className="text-xs text-slate-500">{businessName}</p>
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="rounded-2xl">
                          Perfil
                          <ChevronRight className="ml-2 h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuLabel>{user.email}</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link href="/perfil">Ver perfil</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href="/mi-negocio/configuracion">Configurar negocio</Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => {
                            void signOut();
                            router.push('/');
                          }}
                        >
                          <LogOut className="mr-2 h-4 w-4" />
                          Cerrar sesión
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between lg:hidden">
                  <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback>{getInitials(userName)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">{userName}</p>
                      <p className="truncate text-xs text-slate-500">{businessName}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button asChild className="flex-1 rounded-2xl sm:flex-none">
                      <Link href="/mi-negocio/facturas/nueva">
                        <Plus className="mr-2 h-4 w-4" />
                        Nueva factura
                      </Link>
                    </Button>
                    <Button
                      variant="outline"
                      className="rounded-2xl"
                      onClick={() => {
                        void signOut();
                        router.push('/');
                      }}
                    >
                      Salir
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {statusMessage ? (
              <div
                className={cn(
                  'rounded-2xl border px-4 py-3 text-sm',
                  statusMessage.type === 'success'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : 'border-red-200 bg-red-50 text-red-700'
                )}
              >
                {statusMessage.text}
              </div>
            ) : null}

            <div className="rounded-3xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {businessCopy.betaNotice}
            </div>

            {pendingTasks.length > 0 ? (
              <div className="rounded-3xl border border-blue-100 bg-blue-50 px-4 py-4 text-sm text-blue-900">
                <p className="font-semibold">Prioridades del negocio</p>
                <p className="mt-1 text-blue-700">
                  Hay {pendingTasks.length} punto{pendingTasks.length === 1 ? '' : 's'} pendientes para dejar la base lista.
                </p>
              </div>
            ) : null}

            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

function SidebarContent({
  collapsed,
  onLinkClick,
}: {
  collapsed: boolean;
  onLinkClick?: () => void;
}) {
  const pathname = usePathname();
  const { businessProfile, stats } = useBusinessData();

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-slate-200 px-4 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white">
            <span className="text-lg font-bold">T</span>
          </div>
          {!collapsed ? (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">{businessProfile?.business_name || 'Mi negocio'}</p>
              <p className="truncate text-xs text-slate-500">{businessProfile?.currency || 'MAD'} · Panel de gestión</p>
            </div>
          ) : null}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-6 px-3 py-4">
          {businessNavigation.map((group) => {
            const Icon = group.icon;

            return (
              <div key={group.label} className="space-y-2">
                <div className={cn('flex items-center gap-3 px-3 text-xs font-semibold uppercase tracking-wide text-slate-500', collapsed && 'justify-center px-0')}>
                  <Icon className="h-4 w-4" />
                  {!collapsed ? <span>{group.label}</span> : null}
                </div>

                <div className="space-y-1">
                  {group.items.map((item) => {
                    const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onLinkClick}
                        className={cn(
                          'flex items-center justify-between rounded-2xl px-3 py-3 text-sm transition',
                          active
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200',
                          collapsed && 'justify-center px-2'
                        )}
                      >
                        <span className={cn('truncate', collapsed && 'hidden')}>{item.label}</span>
                        {!collapsed ? (
                          <Badge
                            variant={item.available ? 'secondary' : 'outline'}
                            className={cn(
                              active && item.available ? 'bg-blue-500 text-white' : '',
                              active && !item.available ? 'border-white/40 text-white' : '',
                              !item.available && !active ? 'border-slate-200 text-slate-500' : ''
                            )}
                          >
                            {item.available ? 'Listo' : item.phase}
                          </Badge>
                        ) : (
                          <span className="text-[10px] font-semibold">{item.available ? 'OK' : item.phase.replace('Fase ', 'F')}</span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {!collapsed ? (
        <div className="border-t border-slate-200 p-4">
          <Card className="rounded-2xl border-slate-200 bg-slate-50 shadow-none">
            <CardContent className="space-y-2 p-4 text-sm text-slate-600">
              <p className="font-semibold text-slate-900">Estado de la base</p>
              <p>{stats.activeClientsCount} clientes activos</p>
              <p>{stats.activeCategoriesCount} categorías activas</p>
              <p>{stats.activeAccountsCount} cuentas activas</p>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}

function getInitials(value: string) {
  return value
    .split(/[.\s_-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}
