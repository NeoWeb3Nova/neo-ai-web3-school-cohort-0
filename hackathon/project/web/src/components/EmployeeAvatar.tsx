import type { DigitalEmployee } from '../data/mockData';

interface EmployeeAvatarProps {
  employee?: Pick<DigitalEmployee, 'agent_id' | 'code' | 'name' | 'role' | 'risk_tier'> | null;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

type PortraitProfile = {
  key: string;
  code: string;
  accent: string;
  accentSoft: string;
  jacket: string;
  shirt: string;
  skin: string;
  hair: string;
  hair2: string;
  glasses?: 'round' | 'square';
  hairStyle: 'long' | 'bob' | 'short' | 'silver' | 'swept';
  accessory?: 'earring' | 'tie' | 'hoodie' | 'badge' | 'ledger';
  smile: 'soft' | 'wide' | 'focused';
};

const SIZE_CLASS: Record<NonNullable<EmployeeAvatarProps['size']>, string> = {
  sm: 'w-9 h-9',
  md: 'w-12 h-12',
  lg: 'w-16 h-16',
};

const PROFILES: Record<string, Omit<PortraitProfile, 'code'>> = {
  vega: {
    key: 'vega',
    accent: '#5a9e8a',
    accentSoft: '#d7ebe4',
    jacket: '#6f5aa8',
    shirt: '#fdf8ef',
    skin: '#f4c7aa',
    hair: '#2b1d1f',
    hair2: '#4a3034',
    glasses: 'round',
    hairStyle: 'long',
    accessory: 'badge',
    smile: 'soft',
  },
  lyra: {
    key: 'lyra',
    accent: '#b85c8f',
    accentSoft: '#f1d9e6',
    jacket: '#9d63c7',
    shirt: '#fff6f9',
    skin: '#f1bfa6',
    hair: '#3a2527',
    hair2: '#604044',
    glasses: 'round',
    hairStyle: 'long',
    accessory: 'earring',
    smile: 'wide',
  },
  orion: {
    key: 'orion',
    accent: '#c98b3f',
    accentSoft: '#f1e2cc',
    jacket: '#8b6f56',
    shirt: '#fbf3e5',
    skin: '#e8b38f',
    hair: '#1f1b18',
    hair2: '#3c322c',
    glasses: 'square',
    hairStyle: 'short',
    accessory: 'tie',
    smile: 'soft',
  },
  atlas: {
    key: 'atlas',
    accent: '#5a9e8a',
    accentSoft: '#d9eee9',
    jacket: '#6f5aa8',
    shirt: '#efe8ff',
    skin: '#f0bc9b',
    hair: '#171313',
    hair2: '#2b2222',
    glasses: 'square',
    hairStyle: 'swept',
    accessory: 'hoodie',
    smile: 'wide',
  },
  nova: {
    key: 'nova',
    accent: '#d4a843',
    accentSoft: '#efe4bd',
    jacket: '#6f5aa8',
    shirt: '#fbf6e9',
    skin: '#e9b995',
    hair: '#e9e5db',
    hair2: '#b8b0a2',
    glasses: 'square',
    hairStyle: 'silver',
    accessory: 'ledger',
    smile: 'soft',
  },
};

const FALLBACKS = Object.values(PROFILES);

function hashText(value: string): number {
  return Array.from(value).reduce((hash, char) => ((hash << 5) - hash + char.charCodeAt(0)) >>> 0, 0);
}

function cleanCode(employee?: EmployeeAvatarProps['employee'], label = 'AI'): string {
  const source = employee?.code || employee?.name || label;
  return source.replace(/[^a-z0-9]/gi, '').slice(0, 4).toUpperCase() || 'AI';
}

function profileFor(employee?: EmployeeAvatarProps['employee'], label = 'AI'): PortraitProfile {
  const code = cleanCode(employee, label);
  const identity = `${employee?.code || ''} ${employee?.agent_id || ''} ${employee?.name || ''}`.toLowerCase();
  const matched = Object.entries(PROFILES).find(([key]) => identity.includes(key))?.[1];
  const fallback = FALLBACKS[hashText(identity || label) % FALLBACKS.length];
  return { ...(matched || fallback), code };
}

function Hair({ profile }: { profile: PortraitProfile }) {
  if (profile.hairStyle === 'long') {
    return (
      <>
        <path d="M29 44c-2-16 8-28 21-28 16 0 25 14 21 31-2 11-2 21 5 30-12 2-21-2-25-8-6 6-17 9-30 6 8-8 10-19 8-31Z" fill={profile.hair} />
        <path d="M40 22c8-7 23-2 26 10-8-7-20-7-29 2-1-5 0-9 3-12Z" fill={profile.hair2} opacity="0.9" />
      </>
    );
  }
  if (profile.hairStyle === 'bob') {
    return <path d="M29 39c0-15 10-24 23-24s22 10 22 25c0 17-8 26-22 26s-23-9-23-27Z" fill={profile.hair} />;
  }
  if (profile.hairStyle === 'silver') {
    return (
      <>
        <path d="M28 39c1-15 12-23 25-22 12 1 20 9 21 23-8-8-20-12-34-7-4 2-8 4-12 6Z" fill={profile.hair} />
        <path d="M32 35c10-12 25-13 37-1-13-5-24-4-37 1Z" fill={profile.hair2} opacity="0.9" />
      </>
    );
  }
  if (profile.hairStyle === 'swept') {
    return (
      <>
        <path d="M30 38c3-16 16-24 30-19 8 3 13 9 13 18-10-8-23-9-35-2-3 2-6 3-8 3Z" fill={profile.hair} />
        <path d="M41 21c14-4 26 3 31 14-11-7-22-7-36 1 0-7 2-12 5-15Z" fill={profile.hair2} />
      </>
    );
  }
  return (
    <>
      <path d="M30 39c2-15 13-22 26-20 10 1 17 8 18 20-12-8-29-9-44 0Z" fill={profile.hair} />
      <path d="M36 25c8-7 25-5 33 8-11-5-22-5-35 2 0-4 1-7 2-10Z" fill={profile.hair2} />
    </>
  );
}

function FrontHair({ profile }: { profile: PortraitProfile }) {
  if (profile.hairStyle === 'long') {
    return (
      <>
        <path d="M35 37c6-12 21-17 33 0-10-4-22-5-33 0Z" fill={profile.hair} />
        <path d="M34 38c5-6 12-9 21-10-4 5-9 9-17 12-2 1-3 1-4-2Z" fill={profile.hair2} />
        <path d="M63 37c5 5 7 12 7 21-5-5-7-12-7-21Z" fill={profile.hair} />
      </>
    );
  }
  if (profile.hairStyle === 'silver') {
    return (
      <>
        <path d="M29 39c7-14 27-18 43 0-12-7-28-8-43 0Z" fill={profile.hair} />
        <path d="M34 35c8-8 23-10 35-1-12-4-23-3-35 1Z" fill={profile.hair2} opacity="0.9" />
      </>
    );
  }
  if (profile.hairStyle === 'swept') {
    return (
      <>
        <path d="M31 38c8-14 25-18 41-2-11-6-24-5-41 2Z" fill={profile.hair} />
        <path d="M39 26c10-5 24 0 31 10-11-5-21-4-34 2 0-5 1-9 3-12Z" fill={profile.hair2} />
      </>
    );
  }
  return <path d="M30 39c7-12 27-14 44 0-13-7-29-7-44 0Z" fill={profile.hair} />;
}

function Glasses({ profile }: { profile: PortraitProfile }) {
  if (!profile.glasses) return null;
  const round = profile.glasses === 'round';
  return (
    <g fill="none" stroke="#2d2830" strokeWidth="2" strokeLinecap="round">
      {round ? (
        <>
          <circle cx="43" cy="45" r="6" />
          <circle cx="59" cy="45" r="6" />
        </>
      ) : (
        <>
          <rect x="37" y="40" width="12" height="9" rx="2" />
          <rect x="54" y="40" width="12" height="9" rx="2" />
        </>
      )}
      <path d="M49 45h5" />
    </g>
  );
}

function Accessory({ profile }: { profile: PortraitProfile }) {
  if (profile.accessory === 'earring') return <circle cx="69" cy="51" r="2" fill={profile.accent} />;
  if (profile.accessory === 'tie') return <path d="M49 71l3-6 3 6-3 8-3-8Z" fill={profile.accent} />;
  if (profile.accessory === 'hoodie') return <path d="M34 73c5-9 28-9 35 0-8-2-26-2-35 0Z" fill={profile.accentSoft} opacity="0.75" />;
  if (profile.accessory === 'ledger') return <rect x="63" y="67" width="9" height="12" rx="1.5" fill={profile.accent} opacity="0.9" />;
  return <circle cx="36" cy="70" r="2" fill={profile.accent} />;
}

function Portrait({ profile }: { profile: PortraitProfile }) {
  const mouth = profile.smile === 'wide'
    ? 'M43 57c5 5 13 5 18 0'
    : profile.smile === 'focused'
      ? 'M45 58h13'
      : 'M45 57c4 3 9 3 13 0';

  return (
    <g>
      <path d="M28 84c3-17 13-25 24-25s22 8 26 25H28Z" fill={profile.jacket} />
      <path d="M42 63c5 5 14 5 20 0l-10 15-10-15Z" fill={profile.shirt} />
      <Accessory profile={profile} />
      <Hair profile={profile} />
      <ellipse cx="51" cy="46" rx="18" ry="22" fill={profile.skin} />
      <path d="M34 43c1 16 8 27 18 28 8 0 15-7 17-19-3 14-10 20-18 20-10-1-16-11-17-29Z" fill="#c97f62" opacity="0.18" />
      <FrontHair profile={profile} />
      <ellipse cx="43" cy="45" rx="2.2" ry="2.8" fill="#2d2830" />
      <ellipse cx="59" cy="45" rx="2.2" ry="2.8" fill="#2d2830" />
      <path d="M51 47c-1 4-2 6-4 8 2 1 5 1 7 0" fill="none" stroke="#bf735d" strokeWidth="1.4" strokeLinecap="round" />
      <path d={mouth} fill="none" stroke="#8d3d3a" strokeWidth="2" strokeLinecap="round" />
      <Glasses profile={profile} />
    </g>
  );
}

export default function EmployeeAvatar({ employee, label = 'AI employee avatar', size = 'md', className = '' }: EmployeeAvatarProps) {
  const profile = profileFor(employee, label);
  const seed = hashText(employee?.agent_id || employee?.name || label);
  const clipId = `portrait-clip-${seed}`;
  const bgId = `portrait-bg-${seed}`;
  const glowId = `portrait-glow-${seed}`;

  return (
    <svg
      className={`${SIZE_CLASS[size]} shrink-0 rounded-full ${className}`}
      viewBox="0 0 96 96"
      role="img"
      aria-label={employee ? `${employee.name} avatar` : label}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <clipPath id={clipId}>
          <circle cx="48" cy="48" r="39" />
        </clipPath>
        <linearGradient id={bgId} x1="18" y1="8" x2="78" y2="86" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#fdfcfa" />
          <stop offset="0.42" stopColor={profile.accentSoft} />
          <stop offset="1" stopColor="#d9dee8" />
        </linearGradient>
        <filter id={glowId} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <circle cx="48" cy="48" r="42" fill={profile.accent} opacity="0.28" filter={`url(#${glowId})`} />
      <circle cx="48" cy="48" r="42" fill="#fdfcfa" />
      <circle cx="48" cy="48" r="38.5" fill={`url(#${bgId})`} stroke="#f4f0e8" strokeWidth="1.5" />
      <g clipPath={`url(#${clipId})`}>
        <rect x="9" y="8" width="78" height="78" fill={`url(#${bgId})`} />
        <rect x="12" y="18" width="72" height="10" rx="5" fill="#ffffff" opacity="0.55" />
        <rect x="16" y="31" width="58" height="5" rx="2.5" fill="#8a8478" opacity="0.16" />
        <rect x="62" y="20" width="14" height="22" rx="2" fill="#3d3a36" opacity="0.1" />
        <circle cx="77" cy="28" r="5" fill={profile.accent} opacity="0.18" />
        <Portrait profile={profile} />
      </g>
      <circle cx="48" cy="48" r="41" fill="none" stroke="#ffffff" strokeWidth="5" />
      <circle cx="48" cy="48" r="43.5" fill="none" stroke={profile.accent} strokeOpacity="0.18" strokeWidth="1.5" />
    </svg>
  );
}
