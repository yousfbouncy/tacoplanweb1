/**
 * Resumen operativo de amplitud para Tráfico, calculado en servidor.
 * Replica el criterio conservador de availability-context de Tacoplan móvil:
 * buscar el último descanso semanal observado (>= 24h), contabilizar descansos
 * diarios reducidos no fraccionados y nunca asumir que faltan cero.
 *
 * No certifica cumplimiento legal: solo refleja el historial sincronizado
 * disponible para esta empresa. Ningún dato monetario se expone aquí.
 */
export type TrafficDutyJornada = {
  id: string;
  user_id: string;
  fecha_inicio?: string | null;
  hora_inicio?: string | null;
  fecha_fin?: string | null;
  hora_fin?: string | null;
  start_at?: string | null;
  end_at?: string | null;
  descanso_anterior_min?: number | null;
  tipo_descanso_anterior?: string | null;
  split_rest_detected?: boolean | null;
  split_rest_first_part_min?: number | null;
  split_rest_second_part_min?: number | null;
  counts_as_reduced_rest?: boolean | null;
  is_double_driving?: boolean | null;
};

export type TrafficDutyLimit = {
  status: 'available' | 'exhausted' | 'unknown' | 'double_driving';
  maximumMinutes: 780 | 900 | null;
  reducedRestsUsed: number | null;
  reducedRestsRemaining: number | null;
  reason: string;
};

const UNKNOWN = (reason: string): TrafficDutyLimit => ({
  status: 'unknown', maximumMinutes: null, reducedRestsUsed: null, reducedRestsRemaining: null, reason,
});

const parseTime = (value?: string | null) => {
  if (!value) return NaN;
  return Date.parse(value);
};

function startMs(j: TrafficDutyJornada): number {
  const direct = parseTime(j.start_at);
  if (Number.isFinite(direct)) return direct;
  return parseTime(j.fecha_inicio && j.hora_inicio ? j.fecha_inicio + 'T' + j.hora_inicio : null);
}

function endMs(j: TrafficDutyJornada): number {
  const direct = parseTime(j.end_at);
  if (Number.isFinite(direct)) return direct;
  return parseTime(j.fecha_fin && j.hora_fin ? j.fecha_fin + 'T' + j.hora_fin : null);
}

function completed(j: TrafficDutyJornada) {
  return Boolean(j.end_at || (j.fecha_fin && j.hora_fin));
}

function qualifiedSplitRest(j: TrafficDutyJornada, gap: number) {
  return gap >= 540 && gap < 660 &&
    j.split_rest_detected === true &&
    j.counts_as_reduced_rest === false &&
    (j.split_rest_first_part_min ?? 0) >= 180 &&
    (j.split_rest_second_part_min ?? 0) >= 540;
}

/** Works only with the privacy-filtered jornadas that Tráfico is authorized to view. */
export function calculateTrafficDutyLimit(rows: TrafficDutyJornada[]): TrafficDutyLimit {
  if (!rows.length) return UNKNOWN('No hay historial sincronizado');
  const ordered = [...rows].sort((a,b) => startMs(a) - startMs(b));
  if (ordered.some(j => !Number.isFinite(startMs(j)))) return UNKNOWN('Hay fechas de jornada sin validar');

  const ids = new Set<string>();
  for (const j of ordered) {
    if (ids.has(j.id)) return UNKNOWN('Hay jornadas duplicadas en el historial');
    ids.add(j.id);
  }

  const open = ordered.filter(j => !completed(j));
  if (open.length !== 1 || ordered[ordered.length - 1].id !== open[0].id) {
    return UNKNOWN('No hay una única jornada activa reciente');
  }

  const current = open[0];
  if (current.is_double_driving === true) {
    return { status:'double_driving',maximumMinutes:null,reducedRestsUsed:null,reducedRestsRemaining:null,
      reason:'Doble conducción: corresponde evaluar la ventana de 30 horas' };
  }

  // Contrastar el descanso anterior guardado en la jornada abierta con
  // la separación entre jornadas cuando ambas fuentes están disponibles.
  let boundary = -1;
  for (let i=ordered.length-1;i>0;i--) {
    const prev=ordered[i-1],next=ordered[i];
    const gap=(startMs(next)-endMs(prev))/60000;
    if (!Number.isFinite(gap)) continue;
    if (gap>=1440) {boundary=i;break;}
  }
  if (boundary<0) return UNKNOWN('No consta un descanso semanal completo en el historial compartido');

  let used=0;
  for (let i=boundary+1;i<ordered.length;i++) {
    const prev=ordered[i-1],curr=ordered[i];
    if (!completed(prev)) return UNKNOWN('Falta el cierre de una jornada anterior');
    const prevEnd=endMs(prev),currStart=startMs(curr);
    if (!Number.isFinite(prevEnd)||prevEnd<=startMs(prev))return UNKNOWN('El cierre de una jornada anterior no es válido');
    const gap=(currStart-prevEnd)/60000;
    if (!Number.isFinite(gap)||gap<540) return UNKNOWN('Existe un descanso inferior a 9 horas o sin sincronizar');
    if (gap>=1440) used=0;
    else if (gap<660 && !qualifiedSplitRest(prev,gap)) used++;
  }

  // Si la jornada abierta marca un descanso incompatible, no convertir
  // ausencia de datos en ampliación autorizada.
  if ((current.descanso_anterior_min ?? 540)<540) return UNKNOWN('Descanso anterior insuficiente');
  const remaining=Math.max(0,3-used);
  if (remaining===0 && (current.split_rest_first_part_min ?? 0)>=180) {
    return UNKNOWN('Posible descanso fraccionado 3+9 pendiente de comprobar');
  }
  return {
    status:remaining>0?'available':'exhausted',
    maximumMinutes:remaining>0?900:780,
    reducedRestsUsed:used,
    reducedRestsRemaining:remaining,
    reason:remaining>0
      ? 'Hasta 15 h según descansos registrados desde el último semanal; condicionado al descanso posterior'
      : 'Solo 13 h: tres descansos diarios reducidos desde el último semanal',
  };
}
