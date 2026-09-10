import { cn } from '@/lib/utils';
import { avatarColor, avatarInitials } from '@/lib/format';

interface ContactAvatarProps {
  phone: string;
  size?: number;
  className?: string;
}

export function ContactAvatar({ phone, size = 40, className }: ContactAvatarProps) {
  return (
    <div
      className={cn(
        'shrink-0 rounded-full flex items-center justify-center font-semibold text-white select-none',
        className,
      )}
      style={{
        width: size,
        height: size,
        backgroundColor: avatarColor(phone),
        fontSize: Math.max(10, Math.round(size * 0.34)),
        letterSpacing: '-0.02em',
      }}
      aria-hidden
    >
      {avatarInitials(phone)}
    </div>
  );
}
