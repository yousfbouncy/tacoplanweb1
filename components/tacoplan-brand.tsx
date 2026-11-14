import type { SVGProps } from 'react';

function RoadAgendaMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 74 54" fill="none" role="img" aria-hidden="true" {...props}>
      <defs>
        <linearGradient id="tp-road" x1="3" y1="50" x2="51" y2="5" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFFFFF" /><stop offset="1" stopColor="#D9F4FF" />
        </linearGradient>
      </defs>
      <path d="M32 10H60C64 10 67 13 67 17V45C67 49 64 51 60 51H24" stroke="#FFFFFF" strokeWidth="4.2" strokeLinejoin="round" strokeLinecap="round"/>
      <path d="M43 6V15M57 6V15" stroke="#FFFFFF" strokeWidth="4.5" strokeLinecap="round"/>
      <path d="M36 23H58" stroke="#88CDFF" strokeWidth="2" strokeLinecap="round"/>
      <rect x="40" y="29" width="8" height="7" rx="1.6" fill="#4BB5FF"/>
      <rect x="51" y="29" width="8" height="7" rx="1.6" fill="#4BB5FF" opacity=".85"/>
      <rect x="51" y="39" width="8" height="6" rx="1.6" fill="#B8E6FF"/>
      <path d="M3 50C11 47 19 41 24 31C29 22 27 15 23 9C34 16 39 25 34 35C31 42 25 47 21 50H3Z" fill="url(#tp-road)"/>
      <path d="M25 48C33 40 37 31 34 20" stroke="#075AAB" strokeWidth="2" strokeLinecap="round" strokeDasharray="4 4"/>
    </svg>
  );
}

export function TacoplanBrand() {
  return (
    <span className="inline-flex h-11 shrink-0 items-center gap-2 rounded-xl bg-gradient-to-r from-[#073B85] via-[#0754B7] to-[#083579] px-2.5 pr-3 shadow-sm sm:h-12 sm:gap-2.5 sm:px-3 sm:pr-4">
      <RoadAgendaMark className="h-9 w-[50px] shrink-0 sm:h-10 sm:w-[54px]" />
      <span className="text-[23px] font-extrabold tracking-tight text-white sm:text-[27px]">Tacoplan</span>
    </span>
  );
}
