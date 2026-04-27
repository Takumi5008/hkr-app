import Image from 'next/image'

const SIZE_MAP = {
  xs: { box: 'w-6 h-6',   text: 'text-[10px]', px: 24  },
  sm: { box: 'w-7 h-7',   text: 'text-xs',     px: 28  },
  md: { box: 'w-8 h-8',   text: 'text-sm',     px: 32  },
  lg: { box: 'w-12 h-12', text: 'text-lg',     px: 48  },
  xl: { box: 'w-16 h-16', text: 'text-2xl',    px: 64  },
}

interface Props {
  name: string
  avatar?: string | null
  size?: keyof typeof SIZE_MAP
  className?: string
}

export default function UserAvatar({ name, avatar, size = 'md', className = '' }: Props) {
  const s = SIZE_MAP[size]
  if (avatar) {
    return (
      <div className={`${s.box} rounded-full overflow-hidden shrink-0 ${className}`}>
        <Image src={avatar} alt={name} width={s.px} height={s.px} className="w-full h-full object-cover" unoptimized />
      </div>
    )
  }
  return (
    <div className={`${s.box} rounded-full bg-gradient-to-br from-indigo-500 to-blue-500 flex items-center justify-center text-white font-semibold shrink-0 ${s.text} ${className}`}>
      {name.charAt(0)}
    </div>
  )
}
