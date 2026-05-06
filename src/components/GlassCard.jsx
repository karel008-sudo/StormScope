export default function GlassCard({ children, className = '', strong = false, style, ...rest }) {
  return (
    <div
      className={`rounded-2xl ${strong ? 'glass-strong' : 'glass'} ${className}`}
      style={style}
      {...rest}
    >
      {children}
    </div>
  )
}
