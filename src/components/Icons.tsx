import React from 'react';

interface IconProps {
  size?: number;
  className?: string;
  color?: string;
}

const defaultProps: IconProps = { size: 24, className: '', color: 'currentColor' };

// Chess crown for the landing page hero
export const CrownIcon: React.FC<IconProps> = ({ size = 48, className = '', color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M2 17L3.5 9L7 13L12 4L17 13L20.5 9L22 17H2Z" fill={color} fillOpacity="0.15" stroke={color} strokeWidth="1.5" strokeLinejoin="round"/>
    <path d="M3 20H21" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    <circle cx="12" cy="4" r="1" fill={color}/>
    <circle cx="3.5" cy="9" r="1" fill={color}/>
    <circle cx="20.5" cy="9" r="1" fill={color}/>
  </svg>
);

// Robot / AI icon
export const BotIcon: React.FC<IconProps> = ({ size = 24, className = '', color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <rect x="4" y="8" width="16" height="12" rx="3" stroke={color} strokeWidth="1.5"/>
    <path d="M9 14H9.01" stroke={color} strokeWidth="2.5" strokeLinecap="round"/>
    <path d="M15 14H15.01" stroke={color} strokeWidth="2.5" strokeLinecap="round"/>
    <path d="M10 18H14" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M12 4V8" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    <circle cx="12" cy="3" r="1.5" stroke={color} strokeWidth="1.5"/>
    <path d="M2 14H4" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M20 14H22" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

// Crossed swords for online/multiplayer
export const SwordsIcon: React.FC<IconProps> = ({ size = 24, className = '', color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M5 20L3 22L2 21L4 19L9 14" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M19 4L5 18" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M15 4H19V8" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M19 20L21 22L22 21L20 19L15 14" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M5 4L19 18" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M9 4H5V8" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// Seedling / beginner
export const SeedlingIcon: React.FC<IconProps> = ({ size = 24, className = '', color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M12 22V12" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M12 12C12 8 8 5 4 5C4 9 8 12 12 12Z" fill={color} fillOpacity="0.12" stroke={color} strokeWidth="1.5"/>
    <path d="M12 15C12 11 16 8 20 8C20 12 16 15 12 15Z" fill={color} fillOpacity="0.12" stroke={color} strokeWidth="1.5"/>
  </svg>
);

// Trophy for expert
export const TrophyIcon: React.FC<IconProps> = ({ size = 24, className = '', color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M8 21H16" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M12 17V21" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M7 4H17V9C17 12.3137 14.7614 15 12 15C9.23858 15 7 12.3137 7 9V4Z" fill={color} fillOpacity="0.1" stroke={color} strokeWidth="1.5"/>
    <path d="M17 7H19C20.1046 7 21 7.89543 21 9V9C21 10.1046 20.1046 11 19 11H17" stroke={color} strokeWidth="1.5"/>
    <path d="M7 7H5C3.89543 7 3 7.89543 3 9V9C3 10.1046 3.89543 11 5 11H7" stroke={color} strokeWidth="1.5"/>
  </svg>
);

// Globe for public room
export const GlobeIcon: React.FC<IconProps> = ({ size = 24, className = '', color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.5"/>
    <path d="M3 12H21" stroke={color} strokeWidth="1.5"/>
    <path d="M12 3C14.5 5.5 15.5 8.5 15.5 12C15.5 15.5 14.5 18.5 12 21" stroke={color} strokeWidth="1.5"/>
    <path d="M12 3C9.5 5.5 8.5 8.5 8.5 12C8.5 15.5 9.5 18.5 12 21" stroke={color} strokeWidth="1.5"/>
  </svg>
);

// Lock for private room
export const LockIcon: React.FC<IconProps> = ({ size = 24, className = '', color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <rect x="5" y="11" width="14" height="10" rx="2" stroke={color} strokeWidth="1.5"/>
    <path d="M8 11V7C8 4.79086 9.79086 3 12 3C14.2091 3 16 4.79086 16 7V11" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    <circle cx="12" cy="16" r="1.5" fill={color}/>
  </svg>
);

// Copy / clipboard
export const CopyIcon: React.FC<IconProps> = ({ size = 24, className = '', color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <rect x="9" y="9" width="11" height="11" rx="2" stroke={color} strokeWidth="1.5"/>
    <path d="M5 15H4C3.44772 15 3 14.5523 3 14V5C3 4.44772 3.44772 4 5 4H14C14.5523 4 15 4.44772 15 5V6" stroke={color} strokeWidth="1.5"/>
  </svg>
);

// Castle/tower for empty rooms
export const CastleIcon: React.FC<IconProps> = ({ size = 24, className = '', color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M4 21V10L8 7V3H10V5H14V3H16V7L20 10V21H4Z" stroke={color} strokeWidth="1.5" strokeLinejoin="round"/>
    <rect x="10" y="15" width="4" height="6" stroke={color} strokeWidth="1.5"/>
    <path d="M4 3H8" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M16 3H20" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

// Person / user
export const UserIcon: React.FC<IconProps> = ({ size = 24, className = '', color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="8" r="4" stroke={color} strokeWidth="1.5"/>
    <path d="M5 20C5 17.2386 8.13401 15 12 15C15.866 15 19 17.2386 19 20" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

// Gear / settings
export const GearIcon: React.FC<IconProps> = ({ size = 24, className = '', color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="3" stroke={color} strokeWidth="1.5"/>
    <path d="M12 2V4M12 20V22M22 12H20M4 12H2M19.07 4.93L17.66 6.34M6.34 17.66L4.93 19.07M19.07 19.07L17.66 17.66M6.34 6.34L4.93 4.93" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

// Refresh / reset
export const RefreshIcon: React.FC<IconProps> = ({ size = 24, className = '', color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M4 12C4 7.58172 7.58172 4 12 4C14.8 4 17.2 5.5 18.5 7.7" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M20 12C20 16.4183 16.4183 20 12 20C9.2 20 6.8 18.5 5.5 16.3" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M15 8H19V4" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M9 16H5V20" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// Warning triangle
export const WarningIcon: React.FC<IconProps> = ({ size = 24, className = '', color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M12 3L22 20H2L12 3Z" stroke={color} strokeWidth="1.5" strokeLinejoin="round"/>
    <path d="M12 10V14" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    <circle cx="12" cy="17" r="0.5" fill={color}/>
  </svg>
);

// Close / X
export const CloseIcon: React.FC<IconProps> = ({ size = 24, className = '', color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M6 6L18 18M18 6L6 18" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

// Chess pawn
export const PawnIcon: React.FC<IconProps> = ({ size = 24, className = '', color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="7" r="3" stroke={color} strokeWidth="1.5"/>
    <path d="M8 21H16" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M9 21L10 15H14L15 21" stroke={color} strokeWidth="1.5" strokeLinejoin="round"/>
    <path d="M10 15C10 13 9 12 9 11H15C15 12 14 13 14 15" stroke={color} strokeWidth="1.5"/>
  </svg>
);

// Chess king
export const KingIcon: React.FC<IconProps> = ({ size = 24, className = '', color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2V5" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M10 3H14" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    <circle cx="12" cy="8" r="3" stroke={color} strokeWidth="1.5"/>
    <path d="M7 21H17" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M8 21L9 15H15L16 21" stroke={color} strokeWidth="1.5" strokeLinejoin="round"/>
    <path d="M9 15C9 13.5 8 12.5 8 11.5H16C16 12.5 15 13.5 15 15" stroke={color} strokeWidth="1.5"/>
  </svg>
);

// Arrow right
export const ArrowRightIcon: React.FC<IconProps> = ({ size = 24, className = '', color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M5 12H19M19 12L13 6M19 12L13 18" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
